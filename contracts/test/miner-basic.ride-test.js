chai.config.includeStack = true
chai.use(require('chai-as-promised'))

process.on('unhandledRejection', error => {
    console.log('unhandledRejection', JSON.stringify(error));
});

const wvs = 10 ** 8;
const minute = 1000 * 60
const hour = minute * 60
const day = hour * 24

const { expect } = require('chai');
const { Environment } = require('../common/common')

describe('Miner should compute and distribute m rewards', async function () {

    this.timeout(600000);

    let e, amm;
    let trader1, trader2
    let trader1pk 
    let period, periodStart, periodEnd

    before(async function () {
        await setupAccounts({
            admin: 1 * wvs,
            amm: 0.2 * wvs,
            trader1: 0.2 * wvs,
            trader2: 0.2 * wvs,
        });

        amm = accounts.amm
        trader1 = address(accounts.trader1)
        trader2 = address(accounts.trader2)
        trader1pk = accounts.trader1

        period = Math.floor(new Date().getTime() / 1000 / 604800)
        periodStart = period * 1000 * 604800
        periodEnd   = (period + 1) * 1000 * 604800

        e = new Environment(accounts.admin)
        await e.deploy()
        await e.addAmm(amm)
    });

    it('Should attach reward token to amm', async function () {
        await e.miner.attachRewardAsset(e.assets.tsn, 10)
        await e.miner.attachRewards(amm, e.assets.tsn, 2)
    })

    it('Should compute cumulative fee sum over period', async function () {
        await e.miner.as(amm).notifyFees(trader1, 1)
        await e.miner.as(amm).notifyFees(trader1, 2)
        await e.miner.as(amm).notifyFees(trader2, 5)

        // Trader1 fee in current period = 3
        // Trader2 fee in current period = 5
        // AMM fee = 8
        let t1Fees = await e.miner.getTraderFeeInPeriod(amm, trader1, period)
        let t2Fees = await e.miner.getTraderFeeInPeriod(amm, trader2, period)
        let ammFees = await e.miner.getAmmFeeInPeriod(amm, period)
        let assetFees = await e.miner.getAssetFeeInPeriod(e.assets.tsn, period)

        expect(t1Fees).to.be.eq(3 * wvs)
        expect(t2Fees).to.be.eq(5 * wvs)
        expect(ammFees).to.be.eq(8 * wvs)
        expect(assetFees).to.be.eq(8 * wvs)
    })

    it('Should compute average notional over period', async function () {
        await e.setTime(periodStart + 1 * day)
        // Sanity check
        const { weekStart, weekEnd, timestamp } = await e.miner.getPeriod()

        expect(weekStart).to.be.eq(periodStart)
        expect(weekEnd).to.be.eq(periodEnd)
        expect(timestamp).to.be.eq(periodStart + 1 * day)

        // 1 day after period started, trader 1 have an open interest of 1000
        await e.miner.as(amm).notifyNotional(trader1, 1000)

        // Average trader notional should be (1/7) * 0 + (6/7) * 1000
        let t1Notional = await e.miner.getTraderNotionalInPeriod(amm, trader1, period)

        expect(t1Notional / wvs).to.be.closeTo((1/7) * 0 + (6/7) * 1000, 0.01)
    })

    it('Should compute average notional over period with gaps', async function () {
        await e.setTime(periodStart + 2 * day)

        // 1 day after position opened it's closed
        await e.miner.as(amm).notifyNotional(trader1, 0)

        // Average trader notional should be (1/7) * 0 + (1/7) * 1000 + (5/7) * 0
        let t1Notional = await e.miner.getTraderNotionalInPeriod(amm, trader1, period)

        expect(t1Notional / wvs).to.be.closeTo((1/7) * 0 + (1/7) * 1000 + (5/7) * 0, 0.01)
    })

    it('Should compute average notional over period with multiple gaps', async function () {
        await e.setTime(periodStart + 4 * day)

        // 2 day after position closed trader again open position with 500 notional
        await e.miner.as(amm).notifyNotional(trader1, 500)

        // Average trader notional should be (1/7) * 0 + (1/7) * 1000 + (2/7) * 0 + (3/7) * 500
        let t1Notional = await e.miner.getTraderNotionalInPeriod(amm, trader1, period)

        expect(t1Notional / wvs).to.be.closeTo((1/7) * 0 + (1/7) * 1000 + (2/7) * 0 + (3/7) * 500, 0.01)
    })

    it('Should compute average notional for second trader', async function () {
        await e.miner.as(amm).notifyNotional(trader2, 1500)

        // Average trader notional should be (4/7) * 0 + (3/7) * 1500
        let t2Notional = await e.miner.getTraderNotionalInPeriod(amm, trader2, period)

        expect(t2Notional / wvs).to.be.closeTo((4/7) * 0 + (3/7) * 1500, 0.01)
    })

    it('Should compute trader score and cumulative trader score', async function () {
        const t1Score = await e.miner.getTraderScoreInPeriod(amm, trader1, period)
        const t2Score = await e.miner.getTraderScoreInPeriod(amm, trader2, period)
        const ammScore = await e.miner.getAmmScoreInPeriod(amm, period)

        expect(t1Score + t2Score).to.be.eq(ammScore)

        let t1Fees = await e.miner.getTraderFeeInPeriod(amm, trader1, period)
        let t2Fees = await e.miner.getTraderFeeInPeriod(amm, trader2, period)
        let t1Notional = await e.miner.getTraderNotionalInPeriod(amm, trader1, period)
        let t2Notional = await e.miner.getTraderNotionalInPeriod(amm, trader2, period)

        const a = 0.7
        const e1Score = ((t1Fees / wvs) ** a) * ((t1Notional / wvs) ** (1 - a))
        const e2Score = ((t2Fees / wvs) ** a) * ((t2Notional / wvs) ** (1 - a))

        expect(t1Score / wvs).to.be.closeTo(e1Score, 0.01)
        expect(t2Score / wvs).to.be.closeTo(e2Score, 0.01)
    })

    let trader1Reward

    it('Should distribute rewards according to price', async function () {
        let price = 3.5
        await e.setOracleAssetPrice(e.assets.tsn, price)

        const t1Score = await e.miner.getTraderScoreInPeriod(amm, trader1, period)
        const t2Score = await e.miner.getTraderScoreInPeriod(amm, trader2, period)
        let ammFees = await e.miner.getAmmFeeInPeriod(amm, period)
        
        const t1Share = t1Score / (t1Score + t2Score)
        const t2Share = t2Score / (t1Score + t2Score)
        
        const rewardsInToken = (ammFees / wvs / price) * 2
        const e1Reward = t1Share * rewardsInToken
        const e2Reward = t2Share * rewardsInToken

        const { rewards:t1Reward } = await e.miner.getTraderRewardInPeriod(e.assets.tsn, trader1, period)
        const { rewards:t2Reward } = await e.miner.getTraderRewardInPeriod(e.assets.tsn, trader2, period)

        expect(t2Reward / wvs).to.be.closeTo(e2Reward, 0.01)
        expect(t1Reward / wvs).to.be.closeTo(e1Reward, 0.01)

        trader1Reward = t1Reward
    })

    it('Should not allow trader to claim rewards for current period', async function () {
        await e.supplyTsn(10, address(e.seeds.miner))
        expect(e.miner.as(trader1pk).claimAllRewards(e.assets.tsn, period)).to.eventually.be.rejected
    })

    it('Should allow trader to claim rewards in next period', async function () {
        await e.setTime(periodEnd + 1 * minute)
        await e.miner.as(trader1pk).claimAllRewards(e.assets.tsn, period)

        const { rewards, claimed } = await e.miner.getTraderRewardInPeriod(e.assets.tsn, trader1, period)

        expect(rewards).to.be.eq(0)
        expect(claimed).to.be.eq(trader1Reward)
    })
})