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

const computeFeeAndMargin = (payment, leverage, fee, discount = 1) => {
  let actualFee = fee * discount;
  let amount = payment / (actualFee * leverage + 1);
  return [payment - amount, amount];
};

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
    let [_, margin] = computeFeeAndMargin(2000, 2, 0.0012);
    expect(info.margin / decimals).to.be.closeTo(margin, 0.01);
    await amm.as(longer).closePosition();

    let notional = margin * 2; // with leverage
    let volume = await e.miner.getTraderVolume(longer);
    expect(volume / wvs).to.be.closeTo(2 * notional, 0.01); // open and close position
    expect(volume / wvs).to.be.greaterThan(7900); // open and close position
  });

  it("Open second position resulting in minimal fee discounts", async function () {
    let discount = await e.miner.getComputeFeeDiscount(longer);
    expect(discount / decimals).to.be.eq(0.9);
    await amm.as(longer).increasePosition(2000, DIR_LONG, 1, 0);
    // this pays 18 more fees, but should have no discount
    let info = await amm.getPositionInfo(longer);

    let [_, margin] = computeFeeAndMargin(2000, 1, 0.0012, 0.9);
    expect(info.margin / decimals).to.be.closeTo(margin, 0.01);
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
    expect(volume / wvs).to.be.greaterThan(43907);

    await amm.as(longer).increasePosition(2000, DIR_LONG, 1, 0);
    let [_, margin] = computeFeeAndMargin(2000, 1, 0.0012, 0.8);
    let info = await amm.getPositionInfo(longer);
    expect(info.margin / decimals).to.be.closeTo(margin, 0.01);
    await amm.as(longer).closePosition();
  });
});

describe.only("vAMM should apply rollover fee", async function () {
  this.timeout(600000);

  let e, amm, longer, shorter, liquidator;

  const minute = 1000 * 60;
  const hour = minute * 60;
  const day = 24 * hour;
  const year = day * 365;
  let now = new Date().getTime();

  const advanceDate = async (amount) => {
    now = now + amount;
    await e.setTime(now);
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
      [longer]: 50000,
      [shorter]: 50000,
    });

    amm = await e.deployAmm(1000000, 55, {
      rolloverFee: 0.3,
      initMarginRatio: 0.1,
    });
  });

  it("Should apply rollover fee on margin with leverage", async function () {
    let actualPaymentFor1000Margin = 1000 + 1000 * 3 * 0.0012;
    await amm
      .as(longer)
      .increasePosition(actualPaymentFor1000Margin, DIR_LONG, 3, 0);

    await advanceDate(year / 2);
    let data = await amm.getPositionActualData(longer);

    expect(data.margin).to.be.closeTo(1000 - 1000 * 0.15, 0.1);

    console.log(`Before close position`);
    let tx = await amm.as(longer).closePosition();
    let amount1 = tx.stateChanges.transfers[0].amount;

    // On close additional close fee is taken (it will not affect margin)
    //
    expect(amount1 / decimals).to.be.closeTo(
      1000 - 1000 * 0.15 - 1000 * 3 * 0.0012,
      0.1
    );
  });

  it("Should realize fee on addMargin and pay it to stakers", async function () {
    let actualPaymentFor1000Margin = 1000 + 1000 * 3 * 0.0012;
    await amm
      .as(longer)
      .increasePosition(actualPaymentFor1000Margin, DIR_LONG, 3, 0);

    await advanceDate(year / 2);
    await amm.as(longer).addMargin(5);
    await amm.as(longer).addMargin(0.00001);
    let data = await amm.getPositionActualData(longer);

    expect(data.margin).to.be.closeTo(1005 - 1000 * 0.15, 0.1);

    let tx = await amm.as(longer).closePosition();
    let amount1 = tx.stateChanges.transfers[0].amount;

    expect(amount1 / decimals).to.be.closeTo(
      1005 - 1000 * 0.15 - 1000 * 3 * 0.0012,
      0.1
    );
  });

  it("Should realize fee on removeMargin and pay it to stakers", async function () {
    let actualPaymentFor1000Margin = 1000 + 1000 * 3 * 0.0012;
    await amm
      .as(longer)
      .increasePosition(actualPaymentFor1000Margin, DIR_LONG, 3, 0);

    await advanceDate(year / 2);
    await amm.as(longer).removeMargin(5);
    await amm.as(longer).removeMargin(0.00001);
    let data = await amm.getPositionActualData(longer);

    expect(data.margin).to.be.closeTo(995 - 1000 * 0.15, 0.1);

    let tx = await amm.as(longer).closePosition();
    let amount1 = tx.stateChanges.transfers[0].amount;

    expect(amount1 / decimals).to.be.closeTo(
      995 - 1000 * 0.15 - 1000 * 3 * 0.0012,
      0.1
    );
  });
});
