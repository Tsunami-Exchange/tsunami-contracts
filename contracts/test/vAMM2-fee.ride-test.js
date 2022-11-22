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
const { decimals } = require("../common/utils");

describe("vAMM should rely on fee tiers", async function () {
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
      [longer]: 50000,
      [shorter]: 50000,
    });

    amm = await e.deployAmm(1000000, 55);
  });

  it("Should be able to set fee discount tiers", async function () {
    await e.miner.setFeeDiscountTiers([
      [7900 * wvs, 0.9 * decimals],
      [39600 * wvs, 0.8 * decimals],
    ]);
  });

  it("Open first position resulting in zero fee discounts", async function () {
    await amm.as(longer).increasePosition(2000, DIR_LONG, 2, 0);
    // this pays 20 fees, but should have no discount
    let info = await amm.getPositionInfo(longer);
    let marginWithFee = 2000 - 2000 * 0.01;
    expect(info.margin / decimals).to.be.equal(marginWithFee);
    await amm.as(longer).closePosition();
    let notional = marginWithFee * 2; // with leverage
    let volume = await e.miner.getTraderVolume(longer);
    expect(volume / wvs).to.be.equal(2 * notional); // open and close position
    expect(volume / wvs).to.be.greaterThan(7900); // open and close position
  });

  it("Open second position resulting in minimal fee discounts", async function () {
    let discount = await e.miner.getComputeFeeDiscount(longer);
    expect(discount / decimals).to.be.eq(0.9);

    await amm.as(longer).increasePosition(2000, DIR_LONG, 1, 0);
    // this pays 18 more fees, but should have no discount
    let info = await amm.getPositionInfo(longer);
    expect(info.margin / decimals).to.be.equal(2000 - 2000 * 0.9 * 0.01);
    await amm.as(longer).closePosition();
  });

  it("Open more positions to get more discount", async function () {
    await amm.as(longer).increasePosition(2000, DIR_LONG, 2, 0);
    await amm.as(longer).closePosition();

    await amm.as(longer).increasePosition(2000, DIR_LONG, 2, 0);
    await amm.as(longer).closePosition();

    await amm.as(longer).increasePosition(2000, DIR_LONG, 2, 0);
    await amm.as(longer).closePosition();

    await amm.as(longer).increasePosition(2000, DIR_LONG, 2, 0);
    await amm.as(longer).closePosition();

    // Check we paid 110 in fees in last 30 days
    let volume = await e.miner.getTraderVolume(longer);
    expect(volume / wvs).to.be.equal(43596);

    await amm.as(longer).increasePosition(2000, DIR_LONG, 1, 0);
    let info = await amm.getPositionInfo(longer);
    expect(info.margin / decimals).to.be.equal(2000 - 2000 * 0.8 * 0.01);
    await amm.as(longer).closePosition();
  });
});