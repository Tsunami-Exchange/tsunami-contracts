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

describe("Vault should allow to boost LP rewards", async function () {
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
      e.supplyTsn(700, address(rewardPayer)),
      e.supplyUsdn(1000, address(staker1)),
      e.supplyUsdn(1000, address(staker2)),
    ]);
  });

  it("Can stake USDN in vault", async function () {
    await e.vault.as(staker1).stake(1000);
  });

  it("Can add rewards to Staking", async function () {
    await e.vault.as(rewardPayer).addRewards(700); // 1000 TSN for 1 week = 7 days, 100 per day
  });

  it("Can claim rewards after some time", async function () {
    await e.setTime(now + 0.5 * day);
    await e.vault.as(staker1).withdrawRewards();

    const st1Balance = await tsnBalance(staker1);

    expect(st1Balance).to.be.closeTo(50, 0.2); // 100 per day, 50 per 0.5 day
  });

  it("Can stake USDN mid period", async function () {
    await e.vault.as(staker2).stake(500);
  });

  it("Can claim rewards multiple stakers", async function () {
    await e.setTime(now + 1 * day);
    await e.vault.as(staker1).withdrawRewards();

    const st1Balance = await tsnBalance(staker1);

    expect(st1Balance).to.be.closeTo(50 + (1000 / 1500) * 50, 0.2);
  });

  it("Can claim rewards after un-stake", async function () {
    await e.vault.as(staker2).withdrawRewards();

    const st2Balance = await tsnBalance(staker2);

    expect(st2Balance).to.be.closeTo(0 + (500 / 1500) * 50, 0.2);
  });
});
