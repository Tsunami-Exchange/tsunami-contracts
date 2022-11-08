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

describe("vAMM should be able to adjust peg", async function () {
  this.timeout(600000);

  let e, amm, longer, shorter, liquidator;

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

    amm = await e.deployAmm(100000, 55);
  });

  it("Can add insurance funds", async function () {
    let addInsuranceFundsTx = await e.insurance.deposit(105);

    console.log("Added insurance funds by " + addInsuranceFundsTx.id);
  });

  it("Should have 0 cost to adjust peg to market prices", async function () {
    let priceBefore = await amm.getMarketPrice();
    console.log(`Price before: ${priceBefore}`);
    await amm.as(longer).increasePosition(1000, DIR_LONG, 3, 0.15);
    await amm.as(longer).increasePosition(1000, DIR_LONG, 3, 0.15);
    await amm.as(longer).increasePosition(1000, DIR_LONG, 3, 0.15);
    await amm.as(longer).increasePosition(1000, DIR_LONG, 3, 0.15);
    await amm.as(longer).increasePosition(1000, DIR_LONG, 3, 0.15);

    let priceAfter = await amm.getMarketPrice();
    console.log(`Price after: ${priceAfter}`);
    let costToAdjust = await amm.getPegAdjustCost(priceAfter);
    console.log(`Cost to adjust: ${costToAdjust}`);

    expect(costToAdjust).to.be.closeTo(0, 0.1);
  });

  it("Should have positive cost to adjust peg", async function () {
    console.log(`Should have positive cost to adjust peg`);
    let priceBefore = await amm.getMarketPrice();
    console.log(`priceBefore=${priceBefore}`);
    let targetPrice = priceBefore + 0.5;
    console.log(`targetPrice=${targetPrice}`);
    let costToAdjust = await amm.getPegAdjustCost(targetPrice);
    console.log(`Cost to adjust: ${costToAdjust}`);

    expect(costToAdjust).to.be.closeTo(102.35, 0.1);
    await amm.adjustPeg(targetPrice);
    let priceAfter = await amm.getMarketPrice();
    console.log(`priceAfter=${priceAfter}`);
    expect(priceAfter).to.be.closeTo(targetPrice, 0.001);
  });

  it("Should have negative cost to adjust peg", async function () {
    let priceBefore = await amm.getMarketPrice();
    let targetPrice = priceBefore - 0.5;
    let costToAdjust = await amm.getPegAdjustCost(targetPrice);
    console.log(`Cost to adjust: ${costToAdjust}`);

    expect(costToAdjust).to.be.closeTo(-102.34, 0.1);
    await amm.adjustPeg(targetPrice);
    let priceAfter = await amm.getMarketPrice();
    expect(priceAfter).to.be.closeTo(targetPrice, 0.001);
  });
});
