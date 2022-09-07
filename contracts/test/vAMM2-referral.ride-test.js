chai.config.includeStack = true
chai.use(require('chai-as-promised'))

process.on('unhandledRejection', error => {
    console.log('unhandledRejection', JSON.stringify(error));
});

const wvs = 10 ** 8;
const DIR_LONG = 1
const DIR_SHORT = 2

const { expect } = require('chai');
const { Environment } = require('../common/common')

describe('vAMM should work with referral program', async function () {

    this.timeout(600000);

    let e, amm, longer, shorter, liquidator, referrer;

    before(async function () {
        await setupAccounts({
            admin: 0.1 * wvs,
            longer: 0.1 * wvs,
            shorter: 0.1 * wvs,
            liquidator: 0.1 * wvs,
            referrer: 0.1 * wvs
        });

        longer = accounts.longer
        shorter = accounts.shorter
        liquidator = accounts.liquidator
        referrer = accounts.referrer

        e = new Environment(accounts.admin)
        await e.deploy()
        await e.fundAccounts({
            [longer]: 100,
            [shorter]: 100
        })

        amm = await e.deployAmm(100000, 55)
    });

    it('Can add generate referral links', async function () {
        await e.referral.as(referrer).createReferralLink()
    })

    it('Will auto register a referral on first position increase', async function () {
        let links = await e.referral.getLinksFor(address(referrer))
        let link = links[0]

        await amm.as(longer).increasePosition(5, DIR_LONG, 3, 0.15, link)

        let longerReferrer = await e.referral.getReferrer(address(longer))
        let referrerEarned = await e.referral.getEarned(address(referrer))

        expect(longerReferrer).to.be.eq(address(referrer))
        expect(referrerEarned).to.be.closeTo(5 * 0.01 * 0.20, 0.00001) // 20% of 1% fee of $5
    })

    it('Will earn on addMargin as well for existing referral', async function () {
        await amm.as(longer).addMargin(3)

        let referrerEarned = await e.referral.getEarned(address(referrer))

        expect(referrerEarned).to.be.closeTo((5 + 3) * 0.01 * 0.20, 0.00001) // 20% of 1% fee of $5 + 20% of 1% fee of $3
    })

    it('Will not register a referral after first transaction on a platform without ref link', async function () {
        let links = await e.referral.getLinksFor(address(referrer))
        let link = links[0]

        await amm.as(shorter).increasePosition(5, DIR_SHORT, 3, 0.15) // First tx without ref link
        await amm.as(shorter).increasePosition(5, DIR_SHORT, 3, 0.15, link)
        await amm.as(shorter).addMargin(3)

        let shorterReferrer = await e.referral.getReferrer(address(shorter))
        let referrerEarned = await e.referral.getEarned(address(referrer))

        expect(shorterReferrer).to.be.eq(null)
        expect(referrerEarned).to.be.closeTo((5 + 3) * 0.01 * 0.20, 0.00001) // No new fees
    })


    it('Can claim rewards', async function () {
        await e.referral.as(referrer).claimRewards()

        let referrerEarned = await e.referral.getEarned(address(referrer))
        let referrerClaimed = await e.referral.getClaimed(address(referrer))

        expect(referrerEarned - referrerClaimed).to.be.closeTo(0, 0.00001) 
        expect(referrerClaimed).to.be.closeTo((5 + 3) * 0.01 * 0.20, 0.00001) 
    })

    /*

    it('Can increase position', async function () {
        await amm.as(longer).increasePosition(5, DIR_LONG, 3, 0.15)

        const {
            size,
            margin,
            openNotional
        } = await amm.getPositionInfo(longer)

        expect(size).to.be.eq(809640)
        expect(margin).to.be.eq(14850000)
        expect(openNotional).to.be.eq(44550000)

        const {
            totalSize,
            totalLong,
            totalShort
        } = await amm.totalPositionInfo()

        expect(totalSize).to.be.eq(809640)
        expect(totalLong).to.be.eq(809640)
        expect(totalShort).to.be.eq(0)
    })

    it('Can decrease position', async function () {
        await amm.as(longer).decreasePosition(3, 3, 0.15)

        const {
            size,
            margin,
            openNotional
        } = await amm.getPositionInfo(longer)

        expect(size).to.be.eq(646135)
        expect(margin).to.be.eq(14850007)
        expect(openNotional).to.be.eq(35550007)

        const {
            totalSize,
            totalLong,
            totalShort
        } = await amm.totalPositionInfo()

        expect(totalSize).to.be.eq(646135)
        expect(totalLong).to.be.eq(646135)
        expect(totalShort).to.be.eq(0)
    })

    it('Can add margin', async function () {
        await amm.as(longer).addMargin(3)

        const {
            size,
            margin,
            openNotional
        } = await amm.getPositionInfo(longer)

        expect(size).to.be.eq(646135)
        expect(margin).to.be.eq(17820007)
        expect(openNotional).to.be.eq(35550007)
    })

    it('Can remove margin', async function () {
        await amm.as(longer).removeMargin(2)

        const {
            size,
            margin,
            openNotional
        } = await amm.getPositionInfo(longer)

        expect(size).to.be.eq(646135)
        expect(margin).to.be.eq(15820007)
        expect(openNotional).to.be.eq(35550007)
    })

    it('Can not remove too much margin', async function () {
        expect(amm.as(longer).addMargin(110)).to.eventually.be.rejected
    })

    it('Can open short position', async function () {
        await amm.as(shorter).increasePosition(5, DIR_SHORT, 3, 0.15)
    })

    it('Can increase short position', async function () {
        await amm.as(shorter).increasePosition(1, DIR_SHORT, 3, 0.04)
    })

    it('Can decrease short position', async function () {
        await amm.as(shorter).decreasePosition(1, 3, 0.04)
    })

    it('Can pay funding', async function () {
        await amm.awaitNextFunding()
        await amm.payFunding()
    })

    it('Can close long position', async function () {
        await amm.as(longer).closePosition()
    })

    it('Can close short position', async function () {
        await amm.as(shorter).closePosition()
    })

    */
})