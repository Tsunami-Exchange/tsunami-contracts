chai.config.includeStack = true;
chai.use(require("chai-as-promised"));

process.on("unhandledRejection", (error) => {
  console.log("unhandledRejection", JSON.stringify(error));
});

const wvs = 10 ** 8;
const DIR_LONG = 1;
const DIR_SHORT = 2;

const { expect } = require("chai");
const { Environment } = require("../common/common");

describe("vAMM should be able to adjust peg (for long)", async function () {
  this.timeout(600000);

  let e, amm, longer, shorter;

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
      [shorter]: 100,
    });

    amm = await e.deployAmm(100000, 55, {
      maxPriceImpact: 0.15, // 15%
    });
  });

  it("Can add insurance funds", async function () {
    let addInsuranceFundsTx = await e.insurance.deposit(1000);

    console.log("Added insurance funds by " + addInsuranceFundsTx.id);
  });

  it("Should have 0 cost to adjust peg to terminal price", async function () {
    let priceBefore = await amm.getMarketPrice();
    console.log(`Price before: ${priceBefore}`);
    await amm.as(longer).increasePosition(1000, DIR_LONG, 3, 0.15);
    console.log(`Works!`);
    await amm.as(longer).increasePosition(1000, DIR_LONG, 3, 0.15);
    await amm.as(longer).increasePosition(1000, DIR_LONG, 3, 0.15);
    await amm.as(longer).increasePosition(1000, DIR_LONG, 3, 0.15);
    await amm.as(longer).increasePosition(1000, DIR_LONG, 3, 0.15);
    /*
    let terminalPrice = await amm.getTerminalAmmPrice()
    console.log(`Terminal price: ${terminalPrice}`);
    expect(terminalPrice).to.be.closeTo(55, 0.1);
    
    let costToAdjust = await amm.getPegAdjustCost(terminalPrice);
    console.log(`Cost to adjust: ${costToAdjust}`);

    expect(costToAdjust).to.be.closeTo(0, 0.1);
    */
  });

  it("Should have positive cost to adjust peg in direction of market skew (long)", async function () {
    console.log(`Should have positive cost to adjust peg`);
    //let terminalPriceBefore = await amm.getTerminalAmmPrice();
    //console.log(`terminalPriceBefore=${terminalPriceBefore}`);
    let targetTerminalPrice = 55 + 0.5;
    console.log(`targetTerminalPrice=${targetTerminalPrice}`);
    let costToAdjust = await amm.getPegAdjustCost(targetTerminalPrice);
    console.log(`Cost to adjust: ${costToAdjust}`);

    expect(costToAdjust).to.be.closeTo(158.8, 0.1);
    await amm.setOraclePrice(targetTerminalPrice);
    await amm.syncTerminalPriceToOracle();

    let terminalPriceAfterAdjust = await amm.getTerminalAmmPrice();
    console.log(`terminalPriceAfterAdjust=${terminalPriceAfterAdjust}`);
    let marketPriceAfterAdjust = await amm.getMarketPrice();
    console.log(`marketPriceAfterAdjust=${marketPriceAfterAdjust}`);
    expect(terminalPriceAfterAdjust).to.be.closeTo(
      targetTerminalPrice,
      0.001,
      "terminalPriceAfterAdjust"
    );
    expect(marketPriceAfterAdjust).to.be.greaterThan(
      targetTerminalPrice,
      "marketPriceAfterAdjust > targetTerminalPrice"
    );
    expect(marketPriceAfterAdjust).to.be.greaterThan(
      terminalPriceAfterAdjust,
      "marketPriceAfterAdjust > terminalPriceAfterAdjust"
    );
  });

  it("Should have negative cost to adjust peg in the direction against market skew (long)", async function () {
    let priceBefore = await amm.getTerminalAmmPrice();
    let targetPrice = priceBefore - 0.5;
    let costToAdjust = await amm.getPegAdjustCost(targetPrice);
    console.log(`Cost to adjust: ${costToAdjust}`);

    expect(costToAdjust).to.be.closeTo(-158.8, 0.1);
    await amm.setOraclePrice(targetPrice);
    await amm.syncTerminalPriceToOracle();

    let priceAfter = await amm.getTerminalAmmPrice();
    expect(priceAfter).to.be.closeTo(targetPrice, 0.001);
  });

  it("Should return to terminal price", async function () {
    let targetTerminalPrice = 55.0;
    await amm.as(longer).closePosition();
    let terminalPriceAfterClose = await amm.getTerminalAmmPrice();
    console.log(`terminalPriceAfterClose=${terminalPriceAfterClose}`);
    let marketPriceAfterClose = await amm.getMarketPrice();

    expect(terminalPriceAfterClose).to.be.closeTo(
      targetTerminalPrice,
      0.01,
      "terminalPriceAfterClose"
    );
    expect(marketPriceAfterClose).to.be.closeTo(
      targetTerminalPrice,
      0.01,
      "marketPriceAfterClose"
    );
  });
});

describe("vAMM should be able to adjust peg (for short)", async function () {
  this.timeout(600000);

  let e, amm, longer, shorter;

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
      [longer]: 100,
      [shorter]: 5000,
    });

    amm = await e.deployAmm(100000, 55, {
      maxPriceImpact: 0.15, // 15%
    });
  });

  it("Can add insurance funds", async function () {
    let addInsuranceFundsTx = await e.insurance.deposit(1000);

    console.log("Added insurance funds by " + addInsuranceFundsTx.id);
  });

  it("Should have 0 cost to adjust peg to terminal price", async function () {
    let priceBefore = await amm.getMarketPrice();
    console.log(`Price before: ${priceBefore}`);
    await amm.as(shorter).increasePosition(1000, DIR_SHORT, 3, 0.15);
    console.log(`Works!`);
    await amm.as(shorter).increasePosition(1000, DIR_SHORT, 3, 0.15);
    await amm.as(shorter).increasePosition(1000, DIR_SHORT, 3, 0.15);
    await amm.as(shorter).increasePosition(1000, DIR_SHORT, 3, 0.15);
    await amm.as(shorter).increasePosition(1000, DIR_SHORT, 3, 0.15);
  });

  it("Should have positive cost to adjust peg in direction of market skew (short)", async function () {
    let targetTerminalPrice = 55 - 0.5;
    console.log(`targetTerminalPrice=${targetTerminalPrice}`);
    let costToAdjust = await amm.getPegAdjustCost(targetTerminalPrice);
    console.log(`Cost to adjust: ${costToAdjust}`);

    expect(costToAdjust).to.be.closeTo(117.6, 0.1);
    await amm.setOraclePrice(targetTerminalPrice);
    await amm.syncTerminalPriceToOracle();

    let terminalPriceAfterAdjust = await amm.getTerminalAmmPrice();
    console.log(`terminalPriceAfterAdjust=${terminalPriceAfterAdjust}`);
    let marketPriceAfterAdjust = await amm.getMarketPrice();
    console.log(`marketPriceAfterAdjust=${marketPriceAfterAdjust}`);
    expect(terminalPriceAfterAdjust).to.be.closeTo(
      targetTerminalPrice,
      0.001,
      "terminalPriceAfterAdjust"
    );
    expect(marketPriceAfterAdjust).to.be.lessThan(
      targetTerminalPrice,
      "marketPriceAfterAdjust > targetTerminalPrice"
    );
    expect(marketPriceAfterAdjust).to.be.lessThan(
      terminalPriceAfterAdjust,
      "marketPriceAfterAdjust > terminalPriceAfterAdjust"
    );
  });

  it("Should have negative cost to adjust peg in the direction against market skew (short)", async function () {
    let priceBefore = await amm.getTerminalAmmPrice();
    let targetPrice = priceBefore + 0.5;
    let costToAdjust = await amm.getPegAdjustCost(targetPrice);
    console.log(`Cost to adjust: ${costToAdjust}`);

    expect(costToAdjust).to.be.closeTo(-117.6, 0.1);
    await amm.setOraclePrice(targetPrice);
    await amm.syncTerminalPriceToOracle();

    let priceAfter = await amm.getTerminalAmmPrice();
    expect(priceAfter).to.be.closeTo(targetPrice, 0.001);
  });

  it("Should return to terminal price", async function () {
    let targetTerminalPrice = 55.0;
    await amm.as(shorter).closePosition();
    let terminalPriceAfterClose = await amm.getTerminalAmmPrice();
    console.log(`terminalPriceAfterClose=${terminalPriceAfterClose}`);
    let marketPriceAfterClose = await amm.getMarketPrice();

    expect(terminalPriceAfterClose).to.be.closeTo(
      targetTerminalPrice,
      0.01,
      "terminalPriceAfterClose"
    );
    expect(marketPriceAfterClose).to.be.closeTo(
      targetTerminalPrice,
      0.01,
      "marketPriceAfterClose"
    );
  });
});
