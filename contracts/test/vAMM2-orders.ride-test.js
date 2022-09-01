chai.config.includeStack = true
chai.use(require('chai-as-promised'))

process.on('unhandledRejection', error => {
    console.log('unhandledRejection', JSON.stringify(error));
});

const wvs = 10 ** 8;
const DIR_LONG = 1
const DIR_SHORT = 2

const minute = 1000 * 60
const hour = minute * 60
const day = hour * 24

const { expect } = require('chai');
const { Environment } = require('../common/common');
const { decimals } = require('../common/utils');

const createTakeProfitOrderAndSignature = (_trader, _amm, _price, _due) => {
    const orderStr = `1,${_amm},${publicKey(_trader)},${Math.round(_price * decimals)},${new Date().getTime()},${_due || 0}`
    const r = ["123", orderStr, signBytes(_trader, new TextEncoder().encode("123" + orderStr))]
    return r
}

describe('vAMM should be able to execute delayed orders', async function () {

    this.timeout(600000);

    let e, amm, longer, user, shorter, executor;
    let _order

    before(async function () {
        await setupAccounts({
            admin: 0.1 * wvs,
            longer: 0.1 * wvs,
            user: 0.1 * wvs,
            shorter: 0.1 * wvs,
            executor: 0.2 * wvs,
        });

        longer = accounts.longer
        shorter = accounts.shorter
        executor = accounts.executor
        user = accounts.user

        e = new Environment(accounts.admin)
        await e.deploy()
        await e.fundAccounts({
            [longer] : 50000,
            [shorter]: 50000,
            [user]   : 50000,
        })

        amm = await e.deployAmm(100000, 55)
        _order = createTakeProfitOrderAndSignature(longer, amm.address, 60.0)
    });

    it('Can open position', async function () {
        await amm.as(longer).increasePosition(1000, DIR_LONG, 3, 50)
    })

    it('Rejects order when price has not moved', async function () {
        const [prefix, order, sig] = createTakeProfitOrderAndSignature(longer, amm.address, 60.0)
        return await expect(e.orders.executeOrder(prefix, order, sig)).to.be.eventually.rejected
    })   
    
    it('Rejects order signed by other user', async function () {
        const [prefix, order, sig] = createTakeProfitOrderAndSignature(shorter, amm.address, 52.0)
        return await expect(e.orders.executeOrder(prefix, order, sig)).to.be.eventually.rejected
    })
    
    it('Rejects order with older due date', async function () {
        const [prefix, order, sig] = createTakeProfitOrderAndSignature(longer, amm.address, 52.0, new Date().getTime() - day)
        return await expect(e.orders.executeOrder(prefix, order, sig)).to.be.eventually.rejected
    })

    it('Executes order on higher price', async function () {
        const [prefix, order, sig] = _order
        await Promise.all([
            await amm.as(user).increasePosition(2500, DIR_LONG, 3, 50),
            await amm.as(user).increasePosition(2500, DIR_LONG, 3, 50),
        ])

        await e.orders.executeOrder(prefix, order, sig)
    })

    it('Rejects duplicate order execution', async function () {
        await amm.as(longer).increasePosition(1000, DIR_LONG, 3, 40)
        
        const [prefix, order, sig] = _order

        return await expect(e.orders.executeOrder(prefix, order, sig)).to.be.eventually.rejected
    })

    it('Rejects order made after position close', async function () {
        _order = createTakeProfitOrderAndSignature(longer, amm.address, 60.0)
        const [prefix, order, sig] = _order
        
        await e.setTime(new Date().getTime() + minute) 
        await amm.as(longer).closePosition()
        await e.setTime(new Date().getTime() + 2 * minute) 
        await amm.as(longer).increasePosition(1000, DIR_LONG, 3, 40)

        return await expect(e.orders.executeOrder(prefix, order, sig)).to.be.eventually.rejected
    })
})