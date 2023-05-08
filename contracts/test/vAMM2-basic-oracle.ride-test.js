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
      [longer]: 170,
      [shorter]: 100,
    });

    amm = await e.deployAmm(100000, 55, {
      jitOracleStream: "WAVES",
      maxOracleDelay: 0, // Current block only
    });

    await e.oracle.createStream("BTC", 0.05 * decimals, 10 * decimals);
  });

  it("Can open position", async function () {
    await amm.as(longer).increasePosition(10, DIR_LONG, 3, 0.15);

    const { size, margin, openNotional } = await amm.getPositionInfo(longer);

    expect(size).to.be.eq(543336);
    expect(margin).to.be.eq(9964129);
    expect(openNotional).to.be.eq(29892387);

    const { totalSize, totalLong, totalShort } = await amm.totalPositionInfo();

    expect(totalSize).to.be.eq(543336);
    expect(totalLong).to.be.eq(543336);
    expect(totalShort).to.be.eq(0);
  });

  it("Can increase position", async function () {
    await amm.as(longer).increasePosition(5, DIR_LONG, 3, 0.15);

    const { size, margin, openNotional } = await amm.getPositionInfo(longer);

    expect(size).to.be.eq(814882);
    expect(margin).to.be.eq(14946194);
    expect(openNotional).to.be.eq(44838582);

    const { totalSize, totalLong, totalShort } = await amm.totalPositionInfo();

    expect(totalSize).to.be.eq(814882);
    expect(totalLong).to.be.eq(814882);
    expect(totalShort).to.be.eq(0);
  });

  it("Can add margin", async function () {
    await amm.as(longer).addMargin(3);

    const { size, margin, openNotional } = await amm.getPositionInfo(longer);

    expect(size).to.be.eq(814882);
    expect(margin).to.be.eq(17946194);
    expect(openNotional).to.be.eq(44838582);
  });

  it("Can remove margin", async function () {
    await amm.as(longer).removeMargin(2);

    const { size, margin, openNotional } = await amm.getPositionInfo(longer);

    expect(size).to.be.eq(814882);
    expect(margin).to.be.eq(15946194);
    expect(openNotional).to.be.eq(44838582);
  });

  it("Can not remove too much margin", async function () {
    return expect(amm.as(longer).removeMargin(110)).to.eventually.be.rejected;
  });

  it("Can open short position", async function () {
    await amm.as(shorter).increasePosition(5, DIR_SHORT, 3, 0.15);

    const { size, margin, openNotional } = await amm.getPositionInfo(shorter);
    console.log(JSON.stringify({ size, margin, openNotional }));

    expect(size).to.be.eq(-271546);
    expect(margin).to.be.eq(4982065);
    expect(openNotional).to.be.eq(14946195);
  });

  it("Can increase short position", async function () {
    await amm.as(shorter).increasePosition(1, DIR_SHORT, 3, 0.04);

    const { size, margin, openNotional } = await amm.getPositionInfo(shorter);
    console.log(JSON.stringify({ size, margin, openNotional }));

    expect(size).to.be.eq(-325865);
    expect(margin).to.be.eq(5978478);
    expect(openNotional).to.be.eq(17935434);
  });

  it("Can pay funding", async function () {
    await amm.awaitNextFunding();
    await amm.payFunding();
  });

  it("Can close long position", async function () {
    let tx = await amm.as(longer).closePosition();

    expect(tx.stateChanges.transfers[0].amount).to.be.eq(15876342);
  });

  it("Can close short position", async function () {
    let tx = await amm.as(shorter).closePosition();

    expect(tx.stateChanges.transfers[0].amount).to.be.eq(5973063);
  });

  it("Can partially close long position", async function () {
    await amm.as(longer).increasePosition(150, DIR_LONG, 3, 0); // 150 * 3 / 55 ~ = 8.18 base asset
    const p1 = await amm.getPositionInfo(longer);
    console.log(`P1=${JSON.stringify(p1)}`);

    {
      const { size, margin, openNotional } = await amm.getPositionInfo(longer);

      expect(size).to.be.eq(8116078);
      expect(margin).to.be.eq(149461937);
      expect(openNotional).to.be.eq(448385811);
    }

    let ppcTx = await amm.as(longer).closePosition(4, 200);

    {
      const { size, margin, openNotional } = await amm.getPositionInfo(longer);

      expect(size).to.be.eq(4116078);
      expect(margin).to.be.eq(75632573);
      expect(openNotional).to.be.eq(226897950);

      expect(ppcTx.stateChanges.transfers[0].amount).to.be.equal(73564181);
    }

    const p2 = await amm.getPositionInfo(longer);
    console.log(`P2=${JSON.stringify(p2)}`);

    let ppcTx2 = await amm.as(longer).closePosition();

    {
      expect(ppcTx2.stateChanges.transfers[0].amount).to.be.equal(75360296);
    }
  });
});
