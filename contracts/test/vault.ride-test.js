chai.config.includeStack = true;
chai.use(require("chai-as-promised"));

process.on("unhandledRejection", (error) => {
  console.log("unhandledRejection", JSON.stringify(error));
});

const { expect } = require("chai");
const { Environment } = require("../common/common");
const { decimals, wvs } = require("../common/utils");

let now = new Date().getTime();

const minute = 1000 * 60;
const hour = minute * 60;

describe("Vault should allow", async function () {
  this.timeout(600000);

  let e, staker1, staker2, rewardPayer, amm;

  const usdnBalance = async (seed) => {
    const raw = await assetBalance(e.assets.neutrino, address(seed));
    return Number.parseFloat((raw / decimals).toFixed(4));
  };

  before(async function () {
    await setupAccounts({
      admin: 1 * wvs,
      staker1: 0.1 * wvs,
      staker2: 0.1 * wvs,
      rewardPayer: 0.1 * wvs,
      amm: 0.1 * wvs,
    });

    staker1 = accounts.staker1;
    staker2 = accounts.staker2;
    amm = accounts.amm;
    rewardPayer = accounts.rewardPayer;

    e = new Environment(accounts.admin);
    await e.deploy();

    await Promise.all([
      e.fundAccounts({ [rewardPayer]: 50000 }),
      e.supplyUsdn(10000, address(staker1)),
      e.supplyUsdn(10000, address(staker2)),
      e.setTime(now),
    ]);
  });

  it("Can stake USDN as staker 1", async function () {
    await e.vault.as(staker1).stake(1000);

    let stakedUSDN = await e.vault.usdnBalanceOf(staker1);
    let staked = await e.vault.balanceOf(staker1);
    let locked = await e.vault.lockedBalance();
    let free = await e.vault.freeBalance();

    expect(stakedUSDN).to.be.equal(1000);
    expect(staked).to.be.equal(1000);
    expect(free).to.be.equal(1000);
    expect(locked).to.be.equal(0);
  });

  it("Can add some more money to free", async function () {
    await e.vault.addFree(50);

    let stakedUSDN = await e.vault.usdnBalanceOf(staker1);
    let staked = await e.vault.balanceOf(staker1);
    let locked = await e.vault.lockedBalance();
    let free = await e.vault.freeBalance();
    let rate = await e.vault.rate();

    expect(stakedUSDN).to.be.equal(1050);
    expect(staked).to.be.equal(1000);
    expect(free).to.be.equal(1050);
    expect(locked).to.be.equal(0);
    expect(rate).to.be.equal(1050 / 1000);
  });

  it("Can stake USDN as staker 2", async function () {
    await e.vault.as(staker2).stake(500);

    let stakedUSDN = await e.vault.usdnBalanceOf(staker2);
    let staked = await e.vault.balanceOf(staker2);
    let locked = await e.vault.lockedBalance();
    let free = await e.vault.freeBalance();

    expect(stakedUSDN).to.be.closeTo(500, 0.01);
    expect(staked).to.be.closeTo(476.19, 0.01);
    expect(free).to.be.closeTo(1550, 0.001);
    expect(locked).to.be.closeTo(0, 0.001);
  });

  it("Can distribute losses against all stakers", async function () {
    await e.vault.exchangeFreeAndLocked(100);

    let expectedLoss1 = (1000 / (476.19 + 1000)) * 100;
    let expectedLoss2 = (476.19 / (476.19 + 1000)) * 100;

    let stakedUSDN1 = await e.vault.usdnBalanceOf(staker1);
    let staked1 = await e.vault.balanceOf(staker1);
    let stakedUSDN2 = await e.vault.usdnBalanceOf(staker2);
    let staked2 = await e.vault.balanceOf(staker2);
    let locked = await e.vault.lockedBalance();
    let free = await e.vault.freeBalance();

    expect(stakedUSDN1).to.be.closeTo(1050 - expectedLoss1, 0.1);
    expect(stakedUSDN2).to.be.closeTo(500 - expectedLoss2, 0.1);

    expect(staked1).to.be.closeTo(1000, 0.01);
    expect(staked2).to.be.closeTo(476.19, 0.01);

    expect(free).to.be.closeTo(1450, 0.001);
    expect(locked).to.be.closeTo(100, 0.001);
  });

  it("Can distribute funds back", async function () {
    await e.vault.exchangeFreeAndLocked(-50);

    let expectedLoss1 = (1000 / (476.19 + 1000)) * 50;
    let expectedLoss2 = (476.19 / (476.19 + 1000)) * 50;

    let stakedUSDN1 = await e.vault.usdnBalanceOf(staker1);
    let staked1 = await e.vault.balanceOf(staker1);
    let stakedUSDN2 = await e.vault.usdnBalanceOf(staker2);
    let staked2 = await e.vault.balanceOf(staker2);
    let locked = await e.vault.lockedBalance();
    let free = await e.vault.freeBalance();

    expect(stakedUSDN1).to.be.closeTo(1050 - expectedLoss1, 0.1);
    expect(stakedUSDN2).to.be.closeTo(500 - expectedLoss2, 0.1);

    expect(staked1).to.be.closeTo(1000, 0.01);
    expect(staked2).to.be.closeTo(476.19, 0.01);

    expect(free).to.be.closeTo(1500, 0.001);
    expect(locked).to.be.closeTo(50, 0.001);
  });

  it("Can add profit after losses", async function () {
    await e.vault.addFree(100);

    let expectedWin1 = (1000 / (476.19 + 1000)) * 50;
    let expectedWin2 = (476.19 / (476.19 + 1000)) * 50;

    let stakedUSDN1 = await e.vault.usdnBalanceOf(staker1);
    let staked1 = await e.vault.balanceOf(staker1);
    let stakedUSDN2 = await e.vault.usdnBalanceOf(staker2);
    let staked2 = await e.vault.balanceOf(staker2);
    let locked = await e.vault.lockedBalance();
    let free = await e.vault.freeBalance();

    expect(stakedUSDN1).to.be.closeTo(1050 + expectedWin1, 0.1);
    expect(stakedUSDN2).to.be.closeTo(500 + expectedWin2, 0.1);

    expect(staked1).to.be.closeTo(1000, 0.01);
    expect(staked2).to.be.closeTo(476.19, 0.01);

    expect(free).to.be.closeTo(1600, 0.001);
    expect(locked).to.be.closeTo(50, 0.001);
  });

  it("Can calculate withdraw limit", async function () {
    let limit = await e.vault.getWithdrawLimit(staker1);
    let staker1Usdn = 1083.87;

    expect(limit.amount).to.be.closeTo(staker1Usdn / 4, 0.1);
  });

  it("Can not withdraw outside limit", async function () {
    return expect(e.vault.as(staker1).unStake(500)).to.be.eventually.rejected;
  });

  it("Can withdraw within limit", async function () {
    await e.vault.as(staker1).unStake(100);
    let limit = await e.vault.getWithdrawLimit(staker1);
    let staker1Usdn = 1083.87;

    expect(limit.amount).to.be.closeTo(staker1Usdn / 4 - 100, 0.1);
  });

  it("Can withdraw within limit after timestamp", async function () {
    await e.setTime(now + 1 * hour);

    await e.vault.as(staker1).unStake(100);
    let limit = await e.vault.getWithdrawLimit(staker1);
    let staker1Usdn = 1083.87;

    expect(limit.amount).to.be.closeTo(staker1Usdn / 4 - 200, 0.1);
  });

  it("Limit will reset after 24 hours", async function () {
    await e.setTime(now + 24.1 * hour);

    let limit = await e.vault.getWithdrawLimit(staker1);
    let staker1Usdn = 1083.87;

    expect(limit.amount).to.be.closeTo(staker1Usdn / 4, 0.1);
  });
});

describe.only("Vault should allow full withdrawal", async function () {
  this.timeout(600000);

  let e, staker1, staker2, rewardPayer, amm;

  const usdnBalance = async (seed) => {
    const raw = await assetBalance(e.assets.neutrino, address(seed));
    return Number.parseFloat((raw / decimals).toFixed(4));
  };

  before(async function () {
    await setupAccounts({
      admin: 1 * wvs,
      staker1: 0.1 * wvs,
      staker2: 0.1 * wvs,
      rewardPayer: 0.1 * wvs,
      amm: 0.1 * wvs,
    });

    staker1 = accounts.staker1;
    staker2 = accounts.staker2;
    amm = accounts.amm;
    rewardPayer = accounts.rewardPayer;

    e = new Environment(accounts.admin);
    await e.deploy();

    await Promise.all([
      e.fundAccounts({ [rewardPayer]: 50000 }),
      e.supplyUsdn(10000, address(staker1)),
      e.supplyUsdn(10000, address(staker2)),
      e.setTime(now),
    ]);
  });

  it("Can stake and fully withdraw", async function () {
    await e.vault.as(staker1).stake(1000);
    {
      let stakedUSDN = await e.vault.usdnBalanceOf(staker1);
      let limit = await e.vault.getWithdrawLimit(staker1);
      console.log(`stakedUSDN=${stakedUSDN}`);
      console.log(`limit=${limit.amount}`);
      expect(limit.amount).to.be.equal(250);
    }

    await e.vault.as(staker1).unStake(150);
    {
      let stakedUSDN = await e.vault.usdnBalanceOf(staker1);
      let limit = await e.vault.getWithdrawLimit(staker1);
      console.log(`stakedUSDN=${stakedUSDN}`);
      console.log(`limit=${limit.amount}`);
      expect(limit.amount).to.be.equal(100);
    }

    let now = new Date().getTime();

    now = now + 24 * hour + 0.1 * hour;
    await e.setTime(now);
    await e.vault.as(staker1).unStake(75);
    {
      let stakedUSDN = await e.vault.usdnBalanceOf(staker1);
      let limit = await e.vault.getWithdrawLimit(staker1);
      console.log(`stakedUSDN=${stakedUSDN}`);
      console.log(`limit=${limit.amount}`);
      expect(limit.amount).to.be.equal(175);
    }

    await e.vault.as(staker1).unStake(75);
    {
      let stakedUSDN = await e.vault.usdnBalanceOf(staker1);
      let limit = await e.vault.getWithdrawLimit(staker1);
      console.log(`stakedUSDN=${stakedUSDN}`);
      console.log(`limit=${limit.amount}`);
      expect(limit.amount).to.be.equal(100);
    }

    now = now + 24 * hour + 0.1 * hour;
    await e.setTime(now);
    await e.vault.as(staker1).unStake(150);
    {
      let stakedUSDN = await e.vault.usdnBalanceOf(staker1);
      let limit = await e.vault.getWithdrawLimit(staker1);
      console.log(`stakedUSDN=${stakedUSDN}`);
      console.log(`limit=${limit.amount}`);
      expect(limit.amount).to.be.equal(100);
    }

    now = now + 24 * hour + 0.1 * hour;
    await e.setTime(now);
    await e.vault.as(staker1).unStake(150);
    {
      let stakedUSDN = await e.vault.usdnBalanceOf(staker1);
      let limit = await e.vault.getWithdrawLimit(staker1);
      console.log(`stakedUSDN=${stakedUSDN}`);
      console.log(`limit=${limit.amount}`);
      expect(limit.amount).to.be.equal(100);
    }

    now = now + 24 * hour + 0.1 * hour;
    await e.setTime(now);
    await e.vault.as(staker1).unStake(150);
    {
      let stakedUSDN = await e.vault.usdnBalanceOf(staker1);
      let limit = await e.vault.getWithdrawLimit(staker1);
      console.log(`stakedUSDN=${stakedUSDN}`);
      console.log(`limit=${limit.amount}`);
      expect(limit.amount).to.be.equal(100);
    }

    now = now + 24 * hour + 0.1 * hour;
    await e.setTime(now);
    await e.vault.as(staker1).unStake(150);
    {
      let stakedUSDN = await e.vault.usdnBalanceOf(staker1);
      let limit = await e.vault.getWithdrawLimit(staker1);
      console.log(`stakedUSDN=${stakedUSDN}`);
      console.log(`limit=${limit.amount}`);
      expect(limit.amount).to.be.equal(100);
    }

    now = now + 24 * hour + 0.1 * hour;
    await e.setTime(now);
    await e.vault.as(staker1).unStake(99.9);
    {
      let stakedUSDN = await e.vault.usdnBalanceOf(staker1);
      let limit = await e.vault.getWithdrawLimit(staker1);
      console.log(`stakedUSDN=${stakedUSDN}`);
      console.log(`limit=${limit.amount}`);
      expect(stakedUSDN).to.be.equal(0.1);
      expect(limit.amount).to.be.equal(150.1);
    }
  });
});
