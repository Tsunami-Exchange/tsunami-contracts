chai.config.includeStack = true;
chai.use(require("chai-as-promised"));

process.on("unhandledRejection", (error) => {
  console.log("unhandledRejection", JSON.stringify(error));
});

const wvs = 10 ** 8;
const DIR_LONG = 1;
const DIR_SHORT = 2;

const { expect } = require("chai");
const { Environment, AMM } = require("../common/common");

describe("vAMM should be able to adjust liquidity (increase)", async function () {
  this.timeout(600000);

  /**
   * @type {AMM}
   */
  let amm;

  let e, longer, shorter;

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
      [shorter]: 100,
      [maker]: 10000,
    });

    amm = await e.deployAmm(100000, 55, {
      maxPriceImpact: 0.5, // 50%
    });

    await e.vault.as(maker).stake(10000);
  });

  it("Should be able to change price before", async function () {
    let priceBefore = await amm.getMarketPrice();
    console.log(`Price before: ${priceBefore}`);
    await amm.as(longer).increasePosition(5000, DIR_LONG, 3, 0.15);

    let terminalPrice = await amm.getTerminalAmmPrice();
    console.log(`Terminal price: ${terminalPrice}`);
    expect(terminalPrice).to.be.closeTo(55, 0.01);

    let priceAfter = await amm.getMarketPrice();
    console.log(`Price priceAfter: ${priceAfter}`);

    expect(priceAfter).to.be.greaterThan(priceBefore);
  });

  it("Should be able to adjust liquidity", async function () {
    let priceBefore = await amm.getMarketPrice();
    console.log(`Price before: ${priceBefore}`);
    await amm.changeLiquidity(50000);

    let terminalPrice = await amm.getTerminalAmmPrice();
    console.log(`Terminal price: ${terminalPrice}`);
    expect(terminalPrice).to.be.closeTo(55, 0.01);

    let priceAfter = await amm.getMarketPrice();
    console.log(`Price priceAfter: ${priceAfter}`);

    expect(priceAfter).to.be.lessThan(priceBefore);
  });

  it("Should be able to go to terminal price closing same amount of positions", async function () {
    let priceBefore = await amm.getMarketPrice();
    console.log(`Price before: ${priceBefore}`);
    await amm.as(longer).closePosition();

    let terminalPrice = await amm.getTerminalAmmPrice();
    console.log(`Terminal price: ${terminalPrice}`);
    expect(terminalPrice).to.be.closeTo(55, 0.01);

    let priceAfter = await amm.getMarketPrice();
    console.log(`Price priceAfter: ${priceAfter}`);

    expect(priceAfter).to.be.eq(terminalPrice);
  });
});

describe("vAMM should be able to adjust liquidity (decrease)", async function () {
  this.timeout(600000);

  /**
   * @type {AMM}
   */
  let amm;

  let e, longer, shorter;

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
      [shorter]: 100,
      [maker]: 10000,
    });

    amm = await e.deployAmm(100000, 55, {
      maxPriceImpact: 0.5, // 50%
    });

    await e.vault.as(maker).stake(10000);
  });

  it("Should be able to change price before", async function () {
    let priceBefore = await amm.getMarketPrice();
    console.log(`Price before: ${priceBefore}`);
    await amm.as(longer).increasePosition(5000, DIR_LONG, 3, 0.15);

    let terminalPrice = await amm.getTerminalAmmPrice();
    console.log(`Terminal price: ${terminalPrice}`);
    expect(terminalPrice).to.be.closeTo(55, 0.01);

    let priceAfter = await amm.getMarketPrice();
    console.log(`Price priceAfter: ${priceAfter}`);

    expect(priceAfter).to.be.greaterThan(priceBefore);
  });

  it("Should be able to adjust liquidity", async function () {
    let priceBefore = await amm.getMarketPrice();
    console.log(`Price before: ${priceBefore}`);
    await amm.changeLiquidity(-30000);

    let terminalPrice = await amm.getTerminalAmmPrice();
    console.log(`Terminal price: ${terminalPrice}`);
    expect(terminalPrice).to.be.closeTo(55, 0.01);

    let priceAfter = await amm.getMarketPrice();
    console.log(`Price priceAfter: ${priceAfter}`);

    expect(priceAfter).to.be.greaterThan(priceBefore);
  });

  it("Should be able to go to terminal price closing same amount of positions", async function () {
    let priceBefore = await amm.getMarketPrice();
    console.log(`Price before: ${priceBefore}`);
    await amm.as(longer).closePosition();

    let terminalPrice = await amm.getTerminalAmmPrice();
    console.log(`Terminal price: ${terminalPrice}`);
    expect(terminalPrice).to.be.closeTo(55, 0.01);

    let priceAfter = await amm.getMarketPrice();
    console.log(`Price priceAfter: ${priceAfter}`);

    expect(priceAfter).to.be.eq(terminalPrice);
  });
});

describe("vAMM should be able to adjust liquidity with changed peg", async function () {
  this.timeout(600000);

  /**
   * @type {AMM}
   */
  let amm;

  let e, longer, shorter;

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
      [shorter]: 100,
      [maker]: 10000,
    });

    amm = await e.deployAmm(100000, 55, {
      maxPriceImpact: 0.5, // 50%
    });

    await e.vault.as(maker).stake(10000);
  });

  it("Should be able to change price before", async function () {
    let priceBefore = await amm.getMarketPrice();
    console.log(`Price before: ${priceBefore}`);
    await amm.as(longer).increasePosition(5000, DIR_LONG, 3, 0.15);

    let terminalPrice = await amm.getTerminalAmmPrice();
    console.log(`Terminal price: ${terminalPrice}`);
    expect(terminalPrice).to.be.closeTo(55, 0.01);

    let priceAfter = await amm.getMarketPrice();
    console.log(`Price priceAfter: ${priceAfter}`);

    expect(priceAfter).to.be.greaterThan(priceBefore);
  });

  it("Should be able to change price peg", async function () {
    await amm.setOraclePrice(45);
  });

  it("Should be able to adjust liquidity", async function () {
    let priceBefore = await amm.getMarketPrice();
    console.log(`Price before: ${priceBefore}`);
    await amm.changeLiquidity(50000);

    let terminalPrice = await amm.getTerminalAmmPrice();
    console.log(`Terminal price: ${terminalPrice}`);
    expect(terminalPrice).to.be.closeTo(45, 0.01);

    let priceAfter = await amm.getMarketPrice();
    console.log(`Price priceAfter: ${priceAfter}`);

    expect(priceAfter).to.be.lessThan(priceBefore);
  });

  it("Should be able to go to terminal price closing same amount of positions", async function () {
    let priceBefore = await amm.getMarketPrice();
    console.log(`Price before: ${priceBefore}`);
    await amm.as(longer).closePosition();

    let terminalPrice = await amm.getTerminalAmmPrice();
    console.log(`Terminal price: ${terminalPrice}`);
    expect(terminalPrice).to.be.closeTo(45, 0.01);

    let priceAfter = await amm.getMarketPrice();
    console.log(`Price priceAfter: ${priceAfter}`);

    expect(priceAfter).to.be.eq(terminalPrice);
  });
});
