chai.config.includeStack = true
chai.use(require('chai-as-promised'))

process.on('unhandledRejection', error => {
    console.log('unhandledRejection', JSON.stringify(error));
});

const wvs = 10 ** 8;
const DIR_LONG = 1
const DIR_SHORT = 2

const { Environment } = require('../common/common')

describe('vAMM should be able to simulate attack', async function () {

    this.timeout(600000);

    let e, amm, attacker1, attacker2, attacker3, defender1, liquidator;

    before(async function () {
        await setupAccounts({
            admin: 1 * wvs,
            attacker1: 0.1 * wvs,
            attacker2: 0.1 * wvs,
            attacker3: 0.1 * wvs,
            defender1: 0.1 * wvs,
            liquidator: 0.1 * wvs,
        });

        attacker1 = accounts.attacker1
        attacker2 = accounts.attacker2
        attacker3 = accounts.attacker3

        defender1 = accounts.defender1
        liquidator = accounts.liquidator

        e = new Environment(accounts.admin)
        await e.deploy()
        await e.fundAccounts({
            [attacker1]: 100000,
            [attacker2]: 100000,
            [attacker3]: 100000,
            [defender1]: 100000
        })

        amm = await e.deployAmm(191505, 0.07438436, {
            maxPriceImpact: 0.065
        })
    });

    it('Attacker 1 longs 4,444', async function () {
        console.log(`---- Attacker 1 longs 4,444 ----`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        await amm.as(attacker1).increasePosition(4444, DIR_LONG, 3, 3)

        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`Insurance balance: ${await e.insurance.getBalance()}`)
        console.log(`---- Attacker 1 longs 4,444 ----`)
    })

    it('Attacker 2 longs 4,000', async function () {
        console.log(`---- Attacker 2 longs 4,000 ----`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        await amm.as(attacker2).increasePosition(4000, DIR_LONG, 3, 3)

        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)
        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`Insurance balance: ${await e.insurance.getBalance()}`)
        console.log(`---- Attacker 2 longs 4,000 ----`)
    })

    it('Attacker 1 longs 4,444', async function () {
        console.log(`---- Attacker 1 longs 4,444 ----`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        await amm.as(attacker1).increasePosition(4444, DIR_LONG, 3, 3)

        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)
        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`Insurance balance: ${await e.insurance.getBalance()}`)
        console.log(`---- Attacker 1 longs 4,444 ----`)
    })

    it('Attacker 2 longs 4,000', async function () {
        console.log(`---- Attacker 2 longs 4,000 ----`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        await amm.as(attacker2).increasePosition(4000, DIR_LONG, 3, 3)

        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)
        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`Insurance balance: ${await e.insurance.getBalance()}`)
        console.log(`---- Attacker 2 longs 4,000 ----`)
    })

    it('Attacker 1 longs 4,444', async function () {
        console.log(`---- Attacker 1 longs 4,444Attacker 1 longs 4,444 ----`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        await amm.as(attacker1).increasePosition(4444, DIR_LONG, 3, 3)

        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)
        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`Insurance balance: ${await e.insurance.getBalance()}`)
        console.log(`---- Attacker 1 longs 4,444 ----`)
    })

    it('Attacker 2 longs 2,000', async function () {
        console.log(`---- Attacker 2 longs 2,000 ----`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        await amm.as(attacker2).increasePosition(2000, DIR_LONG, 3, 3)

        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)
        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`Insurance balance: ${await e.insurance.getBalance()}`)
        console.log(`---- Attacker 2 longs 2,000 ----`)
    })

    it('Attacker 1 longs 4,444', async function () {
        console.log(`---- Attacker 1 longs 4,444 ----`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        await amm.as(attacker1).increasePosition(4444, DIR_LONG, 3, 3)

        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)
        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`Insurance balance: ${await e.insurance.getBalance()}`)
        console.log(`---- Attacker 1 longs 4,444 ----`)
    })

    it('Attacker 1 longs 4,139', async function () {
        console.log(`---- Attacker 1 longs 4,139 ----`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        await amm.as(attacker1).increasePosition(4139, DIR_LONG, 3, 3)

        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)
        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`Insurance balance: ${await e.insurance.getBalance()}`)
        console.log(`---- Attacker 1 longs 4,139 ----`)
    })

    it('Attacker 3 shorts 475', async function () {
        console.log(`---- Attacker 3 shorts 475 ----`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        await amm.as(attacker3).increasePosition(475, DIR_SHORT, 3, 3)

        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)
        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        console.log(`attacker3 = ${JSON.stringify(await amm.getPositionActualData(attacker3))}`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`Insurance balance: ${await e.insurance.getBalance()}`)
        console.log(`---- Attacker 3 shorts 475 ----`)
    })

    it('Attacker 3 shorts 200', async function () {
        console.log(`---- Attacker 3 shorts 200 ----`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        await amm.as(attacker3).increasePosition(200, DIR_SHORT, 3, 3)

        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)
        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        console.log(`attacker3 = ${JSON.stringify(await amm.getPositionActualData(attacker3))}`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`Insurance balance: ${await e.insurance.getBalance()}`)
        console.log(`---- Attacker 3 shorts 200 ----`)
    })

    it('Attacker 1 removes 1 margin', async function () {
        console.log(`---- Attacker 1 removes 1 margin ----`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        await amm.as(attacker1).removeMargin(1)

        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)
        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        console.log(`attacker3 = ${JSON.stringify(await amm.getPositionActualData(attacker3))}`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`Insurance balance: ${await e.insurance.getBalance()}`)
        console.log(`---- Attacker 1 removes 1 margin ----`)
    })

    it('Attacker 2 removes 500 margin', async function () {
        console.log(`---- Attacker 2 removes 500 margin ----`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        await amm.as(attacker2).removeMargin(500)

        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)
        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        console.log(`attacker3 = ${JSON.stringify(await amm.getPositionActualData(attacker3))}`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`Insurance balance: ${await e.insurance.getBalance()}`)
        console.log(`---- Attacker 2 removes 500 margin ----`)
    })

    it('Attacker 1 removes 50 margin', async function () {
        console.log(`---- Attacker 1 removes 50 margin ----`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        await amm.as(attacker1).removeMargin(50)

        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)
        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        console.log(`attacker3 = ${JSON.stringify(await amm.getPositionActualData(attacker3))}`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`Insurance balance: ${await e.insurance.getBalance()}`)
        console.log(`---- Attacker 1 removes 50 margin ----`)
    })

    it('Attacker 2 removes 100 margin', async function () {
        console.log(`---- Attacker 2 removes 100 margin ----`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        await amm.as(attacker2).removeMargin(100)

        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)
        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        console.log(`attacker3 = ${JSON.stringify(await amm.getPositionActualData(attacker3))}`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`Insurance balance: ${await e.insurance.getBalance()}`)
        console.log(`---- Attacker 2 removes 100 margin ----`)
    })

    it('Attacker 2 removes 250 margin', async function () {
        console.log(`---- Attacker 2 removes 250 margin ----`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        await amm.as(attacker2).removeMargin(250)

        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)
        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        console.log(`attacker3 = ${JSON.stringify(await amm.getPositionActualData(attacker3))}`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`Insurance balance: ${await e.insurance.getBalance()}`)
        console.log(`---- Attacker 2 removes 250 margin ----`)
    })

    it('Attacker 2 removes 100 margin', async function () {
        console.log(`---- Attacker 2 removes 100 margin ----`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        await amm.as(attacker2).removeMargin(100)

        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)
        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        console.log(`attacker3 = ${JSON.stringify(await amm.getPositionActualData(attacker3))}`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`Insurance balance: ${await e.insurance.getBalance()}`)
        console.log(`---- Attacker 2 removes 100 margin ----`)
    })

    it('Attacker 2 removes 25 margin', async function () {
        console.log(`---- Attacker 2 removes 25 margin ----`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        await amm.as(attacker2).removeMargin(25)

        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)
        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        console.log(`attacker3 = ${JSON.stringify(await amm.getPositionActualData(attacker3))}`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`Insurance balance: ${await e.insurance.getBalance()}`)
        console.log(`---- Attacker 2 removes 25 margin ----`)
    })

    it('Attacker 3 shorts 2000', async function () {
        console.log(`---- Attacker 3 shorts 2000 ----`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        await amm.as(attacker3).increasePosition(2000, DIR_SHORT, 3, 3)

        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)
        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        console.log(`attacker3 = ${JSON.stringify(await amm.getPositionActualData(attacker3))}`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`Insurance balance: ${await e.insurance.getBalance()}`)
        console.log(`---- Attacker 3 shorts 2000 ----`)
    })

    it('Attacker 3 shorts 3000', async function () {
        console.log(`---- Attacker 3 shorts 3000 ----`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        await amm.as(attacker3).increasePosition(3000, DIR_SHORT, 3, 3)

        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)
        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        console.log(`attacker3 = ${JSON.stringify(await amm.getPositionActualData(attacker3))}`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`Insurance balance: ${await e.insurance.getBalance()}`)
        console.log(`---- Attacker 3 shorts 3000 ----`)
    })

    it('Attacker 3 shorts 3000', async function () {
        console.log(`---- Attacker 3 shorts 3000 ----`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        await amm.as(attacker3).increasePosition(3000, DIR_SHORT, 3, 3)

        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)
        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        console.log(`attacker3 = ${JSON.stringify(await amm.getPositionActualData(attacker3))}`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`Insurance balance: ${await e.insurance.getBalance()}`)
        console.log(`---- Attacker 3 shorts 3000 ----`)
    })

    it('Defender 3 shorts 2400', async function () {
        console.log(`---- Defender 3 shorts 2400 ----`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        await amm.as(defender1).increasePosition(2400, DIR_SHORT, 3, 3)

        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)
        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        console.log(`attacker3 = ${JSON.stringify(await amm.getPositionActualData(attacker3))}`)
        console.log(`defender1 = ${JSON.stringify(await amm.getPositionActualData(defender1))}`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`Insurance balance: ${await e.insurance.getBalance()}`)
        console.log(`---- Defender 3 shorts 2400 ----`)
    })

    it('Defender 3 shorts 616', async function () {
        console.log(`---- Defender 3 shorts 616 ----`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        await amm.as(defender1).increasePosition(1000, DIR_SHORT, 3, 3)

        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)
        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        console.log(`attacker3 = ${JSON.stringify(await amm.getPositionActualData(attacker3))}`)
        console.log(`defender1 = ${JSON.stringify(await amm.getPositionActualData(defender1))}`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`Insurance balance: ${await e.insurance.getBalance()}`)
        console.log(`---- Defender 3 shorts 616 ----`)
    })

    it('Defender 1 shorts 1000', async function () {
        console.log(`---- Defender 1 shorts 1000 ----`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        await amm.as(defender1).increasePosition(1000, DIR_SHORT, 3, 3)

        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)
        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        console.log(`attacker3 = ${JSON.stringify(await amm.getPositionActualData(attacker3))}`)
        console.log(`defender1 = ${JSON.stringify(await amm.getPositionActualData(defender1))}`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`Insurance balance: ${await e.insurance.getBalance()}`)
        console.log(`---- Defender 3 shorts 1000 ----`)
    })

    it('Defender 1 shorts 1000', async function () {
        console.log(`---- Defender 1 shorts 1000 ----`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        await amm.as(defender1).increasePosition(1000, DIR_SHORT, 3, 3)

        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)
        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        console.log(`attacker3 = ${JSON.stringify(await amm.getPositionActualData(attacker3))}`)
        console.log(`defender1 = ${JSON.stringify(await amm.getPositionActualData(defender1))}`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`Insurance balance: ${await e.insurance.getBalance()}`)
        console.log(`---- Defender 3 shorts 1000 ----`)
    })

    it('Defender 1 shorts 1000', async function () {
        console.log(`---- Defender 1 shorts 1000 ----`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        await amm.as(defender1).increasePosition(1000, DIR_SHORT, 3, 3)

        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)
        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        console.log(`attacker3 = ${JSON.stringify(await amm.getPositionActualData(attacker3))}`)
        console.log(`defender1 = ${JSON.stringify(await amm.getPositionActualData(defender1))}`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`Insurance balance: ${await e.insurance.getBalance()}`)
        console.log(`---- Defender 3 shorts 1000 ----`)
    })

    it('Defender 1 shorts 1000', async function () {
        console.log(`---- Defender 1 shorts 1000 ----`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        await amm.as(defender1).increasePosition(1000, DIR_SHORT, 3, 3)

        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)
        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        console.log(`attacker3 = ${JSON.stringify(await amm.getPositionActualData(attacker3))}`)
        console.log(`defender1 = ${JSON.stringify(await amm.getPositionActualData(defender1))}`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`Insurance balance: ${await e.insurance.getBalance()}`)
        console.log(`---- Defender 3 shorts 1000 ----`)
    })

    it('Defender 1 shorts 1000', async function () {
        console.log(`---- Defender 1 shorts 1000 ----`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        await amm.as(defender1).increasePosition(1000, DIR_SHORT, 1, 3)

        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)
        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        console.log(`attacker3 = ${JSON.stringify(await amm.getPositionActualData(attacker3))}`)
        console.log(`defender1 = ${JSON.stringify(await amm.getPositionActualData(defender1))}`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`Insurance balance: ${await e.insurance.getBalance()}`)
        console.log(`---- Defender 3 shorts 1000 ----`)
    })

    it('Attacker 3 shorts 3000', async function () {
        console.log(`---- Attacker 3 shorts 3000 ----`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        await amm.as(attacker3).increasePosition(3000, DIR_SHORT, 3, 3)

        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)
        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        console.log(`attacker3 = ${JSON.stringify(await amm.getPositionActualData(attacker3))}`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`Insurance balance: ${await e.insurance.getBalance()}`)
        console.log(`---- Attacker 3 shorts 3000 ----`)
    })

    it('Attacker 3 shorts 3000', async function () {
        console.log(`---- Attacker 3 shorts 3000 ----`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        await amm.as(attacker3).increasePosition(3000, DIR_SHORT, 3, 3)

        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)
        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        console.log(`attacker3 = ${JSON.stringify(await amm.getPositionActualData(attacker3))}`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`Insurance balance: ${await e.insurance.getBalance()}`)
        console.log(`---- Attacker 3 shorts 3000 ----`)
    })

    it('Attacker 1 liquidated', async function () {
        console.log(`---- Attacker 1 liquidated ----`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        await amm.as(liquidator).liquidate(attacker1)
        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)

        await amm.as(liquidator).liquidate(attacker1)

        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        console.log(`attacker3 = ${JSON.stringify(await amm.getPositionActualData(attacker3))}`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`Insurance balance: ${await e.insurance.getBalance()}`)
        console.log(`---- Attacker 1 liquidated ----`)
    })

    it('Attacker 2 liquidated', async function () {
        console.log(`---- Attacker 2 liquidated ----`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        await amm.as(liquidator).liquidate(attacker2)
        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)
        await amm.as(liquidator).liquidate(attacker1)
        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        

        console.log(`attacker1 = ${JSON.stringify(await amm.getPositionActualData(attacker1))}`)
        console.log(`attacker2 = ${JSON.stringify(await amm.getPositionActualData(attacker2))}`)
        console.log(`attacker3 = ${JSON.stringify(await amm.getPositionActualData(attacker3))}`)
        console.log(`defender1 = ${JSON.stringify(await amm.getPositionActualData(defender1))}`)
        console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`)
        console.log(`Insurance balance: ${await e.insurance.getBalance()}`)
        console.log(`---- Attacker 2 liquidated ----`)
    })

    it('Test profit', async function () {
        
    })
    
})