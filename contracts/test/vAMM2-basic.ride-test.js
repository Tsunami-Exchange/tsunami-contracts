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

describe("vAMM should work with positive funding", async function () {
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
      [longer]: 100,
      [shorter]: 100,
    });

    amm = await e.deployAmm(100000, 55);
  });

  it("Can add insurance funds", async function () {
    let addInsuranceFundsTx = await e.insurance.deposit(1);

    console.log("Added insurance funds by " + addInsuranceFundsTx.id);
  });

  it("Can open position", async function () {
    await amm.as(longer).increasePosition(10, DIR_LONG, 3, 0.15);

    const { size, margin, openNotional } = await amm.getPositionInfo(longer);

    expect(size).to.be.eq(539840);
    expect(margin).to.be.eq(9900000);
    expect(openNotional).to.be.eq(29700000);

    const { totalSize, totalLong, totalShort } = await amm.totalPositionInfo();

    expect(totalSize).to.be.eq(539840);
    expect(totalLong).to.be.eq(539840);
    expect(totalShort).to.be.eq(0);
  });

  it("Can increase position", async function () {
    await amm.as(longer).increasePosition(5, DIR_LONG, 3, 0.15);

    const { size, margin, openNotional } = await amm.getPositionInfo(longer);

    expect(size).to.be.eq(809640);
    expect(margin).to.be.eq(14850000);
    expect(openNotional).to.be.eq(44550000);

    const { totalSize, totalLong, totalShort } = await amm.totalPositionInfo();

    expect(totalSize).to.be.eq(809640);
    expect(totalLong).to.be.eq(809640);
    expect(totalShort).to.be.eq(0);
  });

  it("Can decrease position", async function () {
    await amm.as(longer).decreasePosition(3, 3, 0.15);

    const { size, margin, openNotional } = await amm.getPositionInfo(longer);

    expect(size).to.be.eq(646135);
    expect(margin).to.be.eq(14850007);
    expect(openNotional).to.be.eq(35550007);

    const { totalSize, totalLong, totalShort } = await amm.totalPositionInfo();

    expect(totalSize).to.be.eq(646135);
    expect(totalLong).to.be.eq(646135);
    expect(totalShort).to.be.eq(0);
  });

  it("Can add margin", async function () {
    await amm.as(longer).addMargin(3);

    const { size, margin, openNotional } = await amm.getPositionInfo(longer);

    expect(size).to.be.eq(646135);
    expect(margin).to.be.eq(17820007);
    expect(openNotional).to.be.eq(35550007);
  });

  it("Can remove margin", async function () {
    await amm.as(longer).removeMargin(2);

    const { size, margin, openNotional } = await amm.getPositionInfo(longer);

    expect(size).to.be.eq(646135);
    expect(margin).to.be.eq(15820007);
    expect(openNotional).to.be.eq(35550007);
  });

  it("Can not remove too much margin", async function () {
    expect(amm.as(longer).addMargin(110)).to.eventually.be.rejected;
  });

  it("Can open short position", async function () {
    await amm.as(shorter).increasePosition(5, DIR_SHORT, 3, 0.15);
  });

  it("Can increase short position", async function () {
    await amm.as(shorter).increasePosition(1, DIR_SHORT, 3, 0.04);
  });

  it("Can decrease short position", async function () {
    await amm.as(shorter).decreasePosition(1, 3, 0.04);
  });

  it("Can pay funding", async function () {
    await amm.awaitNextFunding();
    await amm.payFunding();
  });

  it("Can close long position", async function () {
    await amm.as(longer).closePosition();
  });

  it("Can close short position", async function () {
    await amm.as(shorter).closePosition();
  });
});
