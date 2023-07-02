chai.config.includeStack = true;
chai.use(require("chai-as-promised"));

process.on("unhandledRejection", (error) => {
  console.log("unhandledRejection", JSON.stringify(error));
});

const { expect } = require("chai");
const { Environment } = require("../common/common");
const { decimals, wvs } = require("../common/utils");

describe("Vault should be able to change asset manager", async function () {
  this.timeout(600000);

  /**
   * @type {Environment}
   */
  let e;
  let staker1, staker2, rewardPayer;

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

  it("Can change asset manager to Simple Manager", async function () {
    let address = await e.deploySimpleAssetManager();
    await e.manager.changeAssetManager(e.assets.neutrino, address);
    {
      let stakedUSDN = await e.vault.usdnBalanceOf(staker1);
      expect(stakedUSDN).to.be.equal(1050);
    }
  });
});
