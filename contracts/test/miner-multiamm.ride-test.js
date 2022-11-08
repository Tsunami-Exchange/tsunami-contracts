chai.config.includeStack = true;
chai.use(require("chai-as-promised"));

process.on("unhandledRejection", (error) => {
  console.log("unhandledRejection", JSON.stringify(error));
});

const wvs = 10 ** 8;
const minute = 1000 * 60;
const hour = minute * 60;
const day = hour * 24;
const price = 3.5;

const { expect } = require("chai");
const { Environment } = require("../common/common");

describe("Miner should work with multiple AMMs and same reward token", async function () {
  this.timeout(600000);

  let e, amm1, amm2;
  let trader1, trader2, trader3, trader4;
  let period, periodStart;

  before(async function () {
    await setupAccounts({
      admin: 1 * wvs,
      amm1: 0.2 * wvs,
      amm2: 0.2 * wvs,
      trader1: 0.2 * wvs,
      trader2: 0.2 * wvs,
      trader3: 0.2 * wvs,
      trader4: 0.2 * wvs,
    });

    amm1 = accounts.amm1;
    amm2 = accounts.amm2;

    trader1 = address(accounts.trader1);
    trader2 = address(accounts.trader2);
    trader3 = address(accounts.trader3);
    trader4 = address(accounts.trader4);

    period = Math.floor(new Date().getTime() / 1000 / 604800);
    periodStart = period * 1000 * 604800;

    e = new Environment(accounts.admin);
    await e.deploy();

    await Promise.all([
      e.setTime(periodStart + 1 * day),
      e.setOracleAssetPrice(e.assets.tsn, price),
      e.addAmm(amm1),
      e.addAmm(amm2),
    ]);
    await Promise.all([
      e.miner.attachRewardAsset(e.assets.tsn, 10),
      e.miner.attachRewards(amm1, e.assets.tsn, 2),
      e.miner.attachRewards(amm2, e.assets.tsn, 1.5),
    ]);
  });

  it("Should take relative fees on AMM into account when computing max distributed amount", async function () {
    await Promise.all([
      e.miner.as(amm1).notifyFees(trader1, 10),
      e.miner.as(amm1).notifyFees(trader2, 20),
      e.miner.as(amm2).notifyFees(trader2, 30),
      e.miner.as(amm2).notifyFees(trader3, 40),
      e.miner.as(amm2).notifyFees(trader4, 50),

      e.miner.as(amm1).notifyNotional(trader1, 1000),
      e.miner.as(amm1).notifyNotional(trader2, 1000),
      e.miner.as(amm2).notifyNotional(trader2, 1000),
      e.miner.as(amm2).notifyNotional(trader3, 1000),
      e.miner.as(amm2).notifyNotional(trader4, 1000),
    ]);

    // Total AMM fees: AMM1: 30, AMM2: 120
    // Total fees for TSN asset: 30 + 120 = 150
    // Total number of TSN tokens are 10, that means, that 3/15  * 10 goes to AMM1 = 2
    // Total number of TSN tokens are 10, that means, that 12/15 * 10 goes to AMM2 = 8
    // Since fees are much higher than TSN total value, we will distribute all of TSN
    // proportionally to the amount of fees in markets

    let assetFees = await e.miner.getAssetFeeInPeriod(e.assets.tsn, period);
    let amm1Fees = await e.miner.getAmmFeeInPeriod(amm1, period);
    let amm2Fees = await e.miner.getAmmFeeInPeriod(amm2, period);

    expect(amm1Fees + amm2Fees).to.be.eq(assetFees);

    let max1 = await e.miner.getMaxAmountOfAssetToDistribute(
      amm1,
      e.assets.tsn,
      period
    );
    let max2 = await e.miner.getMaxAmountOfAssetToDistribute(
      amm2,
      e.assets.tsn,
      period
    );

    expect(max1 + max2).to.be.eq(10 * wvs);

    let rewards = {};

    await Promise.all([
      e.miner
        .getTraderRewardInPeriod(e.assets.tsn, trader1, period)
        .then((r) => (rewards[trader1] = r.rewards)),
      e.miner
        .getTraderRewardInPeriod(e.assets.tsn, trader2, period)
        .then((r) => (rewards[trader2] = r.rewards)),
      e.miner
        .getTraderRewardInPeriod(e.assets.tsn, trader3, period)
        .then((r) => (rewards[trader3] = r.rewards)),
      e.miner
        .getTraderRewardInPeriod(e.assets.tsn, trader4, period)
        .then((r) => (rewards[trader4] = r.rewards)),
    ]);

    const sum =
      rewards[trader1] + rewards[trader2] + rewards[trader3] + rewards[trader4];

    expect(sum / wvs).to.be.closeTo(10, 0.01);
  });
});
