chai.config.includeStack = true;
chai.use(require("chai-as-promised"));

process.on("unhandledRejection", (error) => {
  console.log("unhandledRejection", JSON.stringify(error));
});

const now = new Date().getTime();
const minute = 1000 * 60;
const hour = minute * 60;
const day = hour * 24;

const { expect } = require("chai");
const { Environment } = require("../common/common");
const { decimals, wvs } = require("../common/utils");

describe("Farming should allow", async function () {
  this.timeout(600000);

  let e, staker1, staker2, rewardPayer;

  const tsnBalance = async (seed) => {
    const raw = await assetBalance(e.assets.tsn, address(seed));
    return Number.parseFloat((raw / wvs).toFixed(4));
  };

  before(async function () {
    await setupAccounts({
      admin: 1 * wvs,
      staker1: 0.1 * wvs,
      staker2: 0.1 * wvs,
      rewardPayer: 0.1 * wvs,
    });

    staker1 = accounts.staker1;
    staker2 = accounts.staker2;
    rewardPayer = accounts.rewardPayer;

    e = new Environment(accounts.admin);
    await e.deploy();
    await Promise.all([
      e.fundAccounts({ [rewardPayer]: 50000 }),
      e.supplyTsn(1000, address(staker1)),
      e.supplyTsn(500, address(staker2)),
    ]);
  });

  it("Can stake TSN", async function () {
    await e.farming.as(staker1).stake(1000);
  });

  it("Can add rewards to Staking", async function () {
    await e.staking.as(rewardPayer).addRewards(1000);
  });

  it("Can ack rewards", async function () {
    await e.setTime(now + 0.5 * day);
    let ttx = await e.farming.ackRewards();
    console.log(`Ack in ${ttx.id}`);
  });

  it("Can claim rewards after some time", async function () {
    await e.setTime(now + 1 * day);
    await e.farming.as(staker1).withdrawRewards();

    const st1Balance = await tsnBalance(staker1);

    expect(st1Balance).to.be.closeTo(250, 0.2);
  });

  it("Can stake TSN mid period", async function () {
    await e.farming.as(staker2).stake(500);
  });

  it("Can claim rewards multiple stakers", async function () {
    await e.setTime(now + 1.5 * day);
    await e.farming.as(staker1).withdrawRewards();

    const st1Balance = await tsnBalance(staker1);

    expect(st1Balance).to.be.closeTo(500, 0.2);
  });

  it("Can claim rewards after un-stake", async function () {
    await e.farming.as(staker2).unStake(624);

    const st2Balance = await tsnBalance(staker2);

    expect(st2Balance).to.be.closeTo(624, 0.2);
  });
});
