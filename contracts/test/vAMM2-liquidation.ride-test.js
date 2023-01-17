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
