chai.config.includeStack = true;
chai.use(require("chai-as-promised"));

process.on("unhandledRejection", (error) => {
  console.log("unhandledRejection", JSON.stringify(error));
});

const { expect } = require("chai");
const { Environment } = require("../common/common");
const { decimals, wvs } = require("../common/utils");

describe("Vault should distribute manager rewards", async function () {
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
      e.supplyUsdn(700, address(rewardPayer)),
      e.supplyUsdn(1000, address(staker1)),
      e.supplyUsdn(1000, address(staker2)),
    ]);
  });

  it("Can stake USDN in vault", async function () {
    await e.vault.as(staker1).stake(1000);
    let stakedUSDN = await e.vault.usdnBalanceOf(staker1);
    expect(stakedUSDN).to.be.equal(1000);
  });

  it("Can add rewards to Manager (via Vires)", async function () {
    await e.vires.as(rewardPayer).addProfit(50);
    await e.vault.as(rewardPayer).ackRewards();
  });

  it("Can ack rewards as Vault", async function () {
    let stakedUSDN = await e.vault.usdnBalanceOf(staker1);
    expect(stakedUSDN).to.be.equal(1050);
  });
});
