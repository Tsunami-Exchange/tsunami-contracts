chai.config.includeStack = true;
chai.use(require("chai-as-promised"));

process.on("unhandledRejection", (error) => {
  console.log("unhandledRejection", JSON.stringify(error));
});

const wvs = 10 ** 8;
const decimals = 10 ** 6;
const DIR_LONG = 1;
const DIR_SHORT = 2;

const { expect } = require("chai");
const { Environment } = require("../common/common");

describe("vAMM should be able to liquidate underwater long position", async function () {
  this.timeout(600000);

  let e, amm, longer, shorter, liquidator;

  const usdnBalance = async (seed) => {
    const raw = await assetBalance(e.assets.neutrino, address(seed));
    return Number.parseFloat((raw / decimals).toFixed(4));
  };

  before(async function () {
    await setupAccounts({
      admin: 1 * wvs,
      longer: 0.1 * wvs,
      shorter: 0.1 * wvs,
      liquidator: 0.1 * wvs,
    });

    longer = accounts.longer;
    shorter = accounts.shorter;
    liquidator = accounts.liquidator;

    e = new Environment(accounts.admin);
    await e.deploy();
    await e.fundAccounts({
      [longer]: 5000,
      [shorter]: 50000,
    });

    amm = await e.deployAmm(100_000_000, 1.23);
  });

  it("Can open long position", async function () {
    console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`);
    await amm.as(longer).increasePosition(1000, DIR_LONG, 3, 50);
  });

  it("Can shift price to liquidate long", async function () {
    await amm.setOraclePrice(0.85);
    await amm.syncTerminalPriceToOracle();

    let longerActualData = await amm.getPositionActualData(longer);
    console.log(`longerActualData=${JSON.stringify(longerActualData)}`);

    console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`);
  });

  it("Can partially liquidate long position", async function () {
    await amm.as(liquidator).liquidate(longer);

    console.log(
      `AMM Market Price after liquidation is: ${await amm.getMarketPrice()}`
    );
    let longerActualData = await amm.getPositionActualData(longer);
    console.log(`longerActualData=${JSON.stringify(longerActualData)}`);

    await amm.as(liquidator).liquidate(longer);

    console.log(
      `AMM Market Price after liquidation is: ${await amm.getMarketPrice()}`
    );
    longerActualData = await amm.getPositionActualData(longer);
    console.log(`longerActualData=${JSON.stringify(longerActualData)}`);

    await amm.as(liquidator).liquidate(longer);

    longerActualData = await amm.getPositionActualData(longer);
    console.log(`longerActualData=${JSON.stringify(longerActualData)}`);
    expect(longerActualData.marginRatio).to.be.greaterThanOrEqual(0.08);

    let balanceOfLiq = await usdnBalance(liquidator);
    expect(balanceOfLiq).to.be.closeTo(7.25, 0.1);
  });
});

describe("vAMM should be able to liquidate underwater long position with bad debt + short position", async function () {
  this.timeout(600000);

  let e, amm, longer, shorter, liquidator, maker;
  let expectedFree;

  const usdnBalance = async (seed) => {
    const raw = await assetBalance(e.assets.neutrino, address(seed));
    return Number.parseFloat((raw / decimals).toFixed(4));
  };

  before(async function () {
    await setupAccounts({
      admin: 1 * wvs,
      longer: 0.1 * wvs,
      shorter: 0.1 * wvs,
      liquidator: 0.1 * wvs,
      maker: 0.1 * wvs,
    });

    longer = accounts.longer;
    shorter = accounts.shorter;
    liquidator = accounts.liquidator;
    maker = accounts.maker;

    e = new Environment(accounts.admin);
    await e.deploy();
    await e.fundAccounts({
      [longer]: 5000,
      [shorter]: 5000,
      [maker]: 1000,
    });

    amm = await e.deployAmm(100_000_000, 1.23);
  });

  it("Can open long position", async function () {
    await e.vault.as(maker).stake(1000);

    console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`);
    await amm.as(longer).increasePosition(1000, DIR_LONG, 3, 50);
    await amm.as(shorter).increasePosition(1000, DIR_SHORT, 3, 50);

    let lockedBalance = await e.vault.lockedBalance();
    let freeBalance = await e.vault.freeBalance();

    console.log(JSON.stringify({ lockedBalance, freeBalance }));
    expect(lockedBalance).to.be.closeTo(1992.8258, 0.001);
    expectedFree = 1000 + (1000 * 3 * 0.0012 + 1000 * 3 * 0.0012) / 2; // Collected half of opening fee
    expect(freeBalance).to.be.closeTo(expectedFree, 0.1);
  });

  it("Can shift price to liquidate long with bad debt", async function () {
    await amm.setOraclePrice(0.65);
    await amm.syncTerminalPriceToOracle();

    let longerActualData = await amm.getPositionActualData(longer);
    console.log(`longerActualData=${JSON.stringify(longerActualData)}`);

    let shorterActualData = await amm.getPositionActualData(shorter);
    console.log(`shorterActualData=${JSON.stringify(shorterActualData)}`);

    console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`);

    let lockedBalance = await e.vault.lockedBalance();
    let freeBalance = await e.vault.freeBalance();

    console.log(JSON.stringify({ lockedBalance, freeBalance }));
    expect(lockedBalance).to.be.closeTo(1992.8258, 0.001);
    expect(freeBalance).to.be.closeTo(expectedFree, 0.1); // Long and short balanced, nothing changes
  });

  it("Can fully liquidate long position", async function () {
    {
      let balanceOfLiq = await usdnBalance(liquidator);
      expect(balanceOfLiq).to.be.closeTo(0, 0.1);
    }

    await amm.as(liquidator).liquidate(longer);

    let balanceOfLiq = await usdnBalance(liquidator);
    expect(balanceOfLiq).to.be.closeTo(7.9, 0.1);

    let lockedBalance = await e.vault.lockedBalance();
    let freeBalance = await e.vault.freeBalance();

    console.log(JSON.stringify({ lockedBalance, freeBalance }));
    expect(lockedBalance).to.be.closeTo(2406.0679, 0.001);
    expectedFree = expectedFree - 413.2421 - 7.9 - 7.9 + 7.9; // Makers pay bad debt, liq. fee, but get 1/2 fee back
    expect(freeBalance).to.be.closeTo(expectedFree, 0.1);
  });

  it("Can close short position in profit", async function () {
    let shorterActualData = await amm.getPositionActualData(shorter);
    console.log(`shorterActualData=${JSON.stringify(shorterActualData)}`);

    await amm.as(shorter).closePosition();

    let lockedBalance = await e.vault.lockedBalance();
    let freeBalance = await e.vault.freeBalance();

    console.log(JSON.stringify({ lockedBalance, freeBalance }));
    expect(lockedBalance).to.be.closeTo(0, 0.001); // All positions are closed

    expectedFree = expectedFree + (1579.5837 * 0.0012) / 2; // Got fee for short
    expect(freeBalance).to.be.closeTo(expectedFree, 0.1);
  });
});
