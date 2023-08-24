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

describe("vAMM should be able to liquidate underwater long position (small)", async function () {
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

    amm = await e.deployAmm(15_000_000, 25_000, {
      initMarginRatio: 0.05,
      maintenanceMarginRatio: 0.015,
      liquidationFeeRatio: 0.0075,
      fee: 0.0012,
      maxPriceSpread: 0.035,
      spreadLimit: 0.035 / 2,
      maxPriceImpact: 0.01,
      partialLiquidationRatio: 0.15,
      maxOpenNotional: 1_000_000 / 2,
      feeToStakersPercent: 0.3,
      rolloverFee: 0.3,
      fundingMode: 2,
      minPartialLiquidationNotional: 100,
    });
  });

  it("Can open long position", async function () {
    console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`);
    await amm.as(longer).increasePosition(1000, DIR_LONG, 10);
  });

  it("Can shift price to liquidate long", async function () {
    await amm.setOraclePrice(22_830);
    await amm.syncTerminalPriceToOracle();

    let longerActualData = await amm.getPositionActualData(longer);
    console.log(`longerActualData=${JSON.stringify(longerActualData)}`);

    expect(longerActualData.margin).to.be.closeTo(130.45, 0.05);
    expect(longerActualData.marginRatio).to.be.closeTo(0.0145, 0.001);
    expect(longerActualData.unrealizedPnl).to.be.closeTo(-857.7, 0.05);
    expect(longerActualData.openNotional).to.be.closeTo(9881.42, 0.05);
    expect(longerActualData.size).to.be.closeTo(0.395, 0.001);
  });

  it("Can partially liquidate long position", async function () {
    await amm.as(liquidator).liquidate(longer);

    {
      let longerActualData = await amm.getPositionActualData(longer);
      console.log(`longerActualData=${JSON.stringify(longerActualData)}`);

      expect(longerActualData.margin).to.be.closeTo(120.29, 0.05);
      expect(longerActualData.marginRatio).to.be.closeTo(0.0157, 0.001);
      expect(longerActualData.unrealizedPnl).to.be.closeTo(-729.045, 0.05);
      expect(longerActualData.openNotional).to.be.closeTo(8398.44, 0.05);
      expect(longerActualData.size).to.be.closeTo(0.335, 0.001);

      // Note that:
      // before openNotional = 9881.42
      // after  openNotional = 8398.44
      // open notional delta = 1482.98
      // that's exactly 0.15 (15%) from 9881.42
    }
  });
});

describe.only("vAMM should be able to liquidate underwater long position (large)", async function () {
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

    amm = await e.deployAmm(15_000_000, 25_000, {
      initMarginRatio: 0.05,
      maintenanceMarginRatio: 0.015,
      liquidationFeeRatio: 0.0075,
      fee: 0.0012,
      maxPriceSpread: 0.035,
      spreadLimit: 0.035 / 2,
      maxPriceImpact: 0.01,
      partialLiquidationRatio: 0.15,
      maxOpenNotional: 1_000_000 / 2,
      feeToStakersPercent: 0.3,
      rolloverFee: 0.3,
      fundingMode: 2,
      minPartialLiquidationNotional: 100,
    });
  });

  it("Can open long position", async function () {
    console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`);
    await amm.as(longer).increasePosition(1000, DIR_LONG, 10);
  });

  it("Can shift price to liquidate long", async function () {
    await amm.setOraclePrice(22_700);
    await amm.syncTerminalPriceToOracle();

    let longerActualData = await amm.getPositionActualData(longer);
    console.log(`longerActualData=${JSON.stringify(longerActualData)}`);

    expect(longerActualData.margin).to.be.closeTo(79.058, 0.05);
    expect(longerActualData.marginRatio).to.be.closeTo(0.0088, 0.001);
    expect(longerActualData.unrealizedPnl).to.be.closeTo(-909.08, 0.05);
    expect(longerActualData.openNotional).to.be.closeTo(9881.42, 0.05);
    expect(longerActualData.size).to.be.closeTo(0.395, 0.001);
  });

  it("Can partially liquidate long position", async function () {
    await amm.as(liquidator).liquidate(longer);

    {
      let longerActualData = await amm.getPositionActualData(longer);
      console.log(`longerActualData=${JSON.stringify(longerActualData)}`);

      expect(longerActualData.margin).to.be.closeTo(51.293, 0.05);
      expect(longerActualData.marginRatio).to.be.closeTo(0.0097, 0.001);
      expect(longerActualData.unrealizedPnl).to.be.closeTo(-533.99, 0.05);
      expect(longerActualData.openNotional).to.be.closeTo(5802.91, 0.05);
      expect(longerActualData.size).to.be.closeTo(0.232, 0.001);

      // Note that:
      // before openNotional = 9881.42
      // after  openNotional = 5802.90
      // open notional delta = 4078.01
      // that's 0.412 (41.2%) from 9881.42, more then 15%
    }
  });
});
