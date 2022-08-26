chai.config.includeStack = true
chai.use(require('chai-as-promised'))

process.on('unhandledRejection', error => {
    console.log('unhandledRejection', JSON.stringify(error));
});

const wvs = 10 ** 8;
const DIR_LONG = 1
const DIR_SHORT = 2

const { expect } = require('chai');
const { Environment } = require('./common')

describe('vAMM should be able to liquidate underwater long position', async function () {

    this.timeout(600000);

    let e, amm, longer, shorter, liquidator;

    before(async function () {
        await setupAccounts({
            admin: 0.1 * wvs,
            longer: 0.1 * wvs,
            shorter: 0.1 * wvs,
            liquidator: 0.1 * wvs,
        });

        longer = accounts.longer
        shorter = accounts.shorter
        liquidator = accounts.liquidator

        e = new Environment(accounts.admin)
        await e.deploy()
        await e.fundAccounts({
            [longer]: 5000,
            [shorter]: 50000
        })

        amm = await e.deployAmm(100000, 55)
    });

    it('Can add insurance funds', async function () {
        let addInsuranceFundsTx = await e.insurance.deposit(1)

        console.log('Added insurance funds by ' + addInsuranceFundsTx.id)
    })

    it('Can open long position', async function () {
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        await amm.as(longer).increasePosition(1000, DIR_LONG, 3, 50)
    })

    it('Can open multiple short positions (to liquidate long)', async function () {
        console.log(`AMM Market Price before big short is: ${await amm.getMarketPrice()}`)

        await Promise.all([
            amm.as(shorter).increasePosition(2000, DIR_SHORT, 3, 1),
            amm.as(shorter).increasePosition(2000, DIR_SHORT, 3, 1),
            amm.as(shorter).increasePosition(2200, DIR_SHORT, 3, 1)
        ])

        let longerActualData =  await amm.getPositionActualData(longer)
        console.log(`longerActualData=${JSON.stringify(longerActualData)}`)
        
        console.log(`AMM Market Price after big short is: ${await amm.getMarketPrice()}`)        
    })

    it('Can not liquidate long position in manipulated market', async function () {
        expect(amm.as(liquidator).liquidate(longer)).to.eventually.be.rejected
    })

    it('Can partially liquidate long position', async function () {
        await amm.syncOraclePriceWithMarketPrice()
        await amm.as(liquidator).liquidate(longer)
        
        console.log(`AMM Market Price after liquidation is: ${await amm.getMarketPrice()}`)
        let longerActualData =  await amm.getPositionActualData(longer)
        console.log(`longerActualData=${JSON.stringify(longerActualData)}`)        

        await amm.as(liquidator).liquidate(longer)
        
        console.log(`AMM Market Price after liquidation is: ${await amm.getMarketPrice()}`)
        longerActualData =  await amm.getPositionActualData(longer)
        console.log(`longerActualData=${JSON.stringify(longerActualData)}`)        

        await amm.as(liquidator).liquidate(longer)
        
        longerActualData =  await amm.getPositionActualData(longer)
        console.log(`longerActualData=${JSON.stringify(longerActualData)}`)
        expect(longerActualData.marginRatio).to.be.greaterThanOrEqual(0.08)
    })

    it('Can close short position', async function () {
        //let insuranceBefore = await e.insurance.getBalance()
        await amm.as(shorter).decreasePosition(2000, 3, 1)
        await amm.as(shorter).decreasePosition(2000, 3, 1)
        await amm.as(shorter).closePosition()
        //let insuranceAfter = await e.insurance.getBalance()

        //expect(insuranceBefore).to.be.eq(insuranceAfter)
    })
})