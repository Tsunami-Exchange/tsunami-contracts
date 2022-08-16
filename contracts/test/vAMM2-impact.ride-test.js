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

describe('vAMM should be able to handle large price impacts', async function () {

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

    it('Can not open long position with large price impact', async function () {
        expect(amm.as(longer).increasePosition(3000, DIR_LONG, 3, 50)).to.eventually.be.rejected
    })

    it('Can not open short position with large price impact', async function () {
        expect(amm.as(shorter).increasePosition(3000, DIR_SHORT, 3, 50)).to.eventually.be.rejected
    })

    it('Can open long position without large price impact', async function () {
        await amm.as(longer).increasePosition(2500, DIR_LONG, 3, 50)
    })

    it('Can open short position without large price impact', async function () {
        await amm.as(shorter).increasePosition(2500, DIR_SHORT, 3, 50)
    })
    
})