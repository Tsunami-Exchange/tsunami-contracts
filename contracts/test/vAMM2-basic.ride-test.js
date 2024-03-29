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

describe("vAMM should work with positive funding", async function () {
  this.timeout(600000);

  /**
   * @type {Environment}
   */
  let e;

  /**
   * @type {AMM}
   */
  let amm;

  let longer, shorter, liquidator;

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

    amm = await e.deployAmm(100000, 55);
  });

  it("Can open position", async function () {
    {
      let ammData = await amm.getAmmData();

      expect(ammData.quoteAssetReserve).to.be.closeTo(100000, 0.01);
      expect(ammData.baseAssetReserve).to.be.closeTo(1818.1818, 0.01);
      expect(ammData.quoteAssetWeight).to.be.closeTo(1, 0.001);
      expect(ammData.totalPositionSize).to.be.closeTo(0, 0.01);
    }

    await amm.as(longer).increasePosition(10, DIR_LONG, 3, 0.15);

    {
      let ammData = await amm.getAmmData();

      expect(ammData.quoteAssetReserve).to.be.closeTo(100029.8924, 0.01);
      expect(ammData.baseAssetReserve).to.be.closeTo(1817.6385, 0.01);
      expect(ammData.quoteAssetWeight).to.be.closeTo(1, 0.001);
      expect(ammData.totalPositionSize).to.be.closeTo(0.5433, 0.01);
    }

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

    {
      let ammData = await amm.getAmmData();

      expect(ammData.quoteAssetReserve).to.be.closeTo(100044.8386, 0.01);
      expect(ammData.baseAssetReserve).to.be.closeTo(1817.3669, 0.01);
      expect(ammData.quoteAssetWeight).to.be.closeTo(1, 0.001);
      expect(ammData.totalPositionSize).to.be.closeTo(0.8149, 0.01);
    }

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

    {
      let ammData = await amm.getAmmData();

      expect(ammData.quoteAssetReserve).to.be.closeTo(100044.8386, 0.01);
      expect(ammData.baseAssetReserve).to.be.closeTo(1817.3669, 0.01);
      expect(ammData.quoteAssetWeight).to.be.closeTo(1, 0.001);
      expect(ammData.totalPositionSize).to.be.closeTo(0.8149, 0.01);
    }

    const { size, margin, openNotional } = await amm.getPositionInfo(longer);

    expect(size).to.be.eq(814882);
    expect(margin).to.be.eq(17946194);
    expect(openNotional).to.be.eq(44838582);
  });

  it("Can remove margin", async function () {
    await amm.as(longer).removeMargin(2);

    {
      let ammData = await amm.getAmmData();

      expect(ammData.quoteAssetReserve).to.be.closeTo(100044.8386, 0.01);
      expect(ammData.baseAssetReserve).to.be.closeTo(1817.3669, 0.01);
      expect(ammData.quoteAssetWeight).to.be.closeTo(1, 0.001);
      expect(ammData.totalPositionSize).to.be.closeTo(0.8149, 0.01);
    }

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

    {
      let ammData = await amm.getAmmData();

      expect(ammData.quoteAssetReserve).to.be.closeTo(100029.8924, 0.01);
      expect(ammData.baseAssetReserve).to.be.closeTo(1817.6385, 0.01);
      expect(ammData.quoteAssetWeight).to.be.closeTo(1, 0.001);
      expect(ammData.totalPositionSize).to.be.closeTo(0.5433, 0.01);
    }

    const { size, margin, openNotional } = await amm.getPositionInfo(shorter);
    console.log(JSON.stringify({ size, margin, openNotional }));

    expect(size).to.be.eq(-271546);
    expect(margin).to.be.eq(4982065);
    expect(openNotional).to.be.eq(14946195);
  });

  it("Can increase short position", async function () {
    await amm.as(shorter).increasePosition(1, DIR_SHORT, 3, 0.04);

    {
      let ammData = await amm.getAmmData();

      expect(ammData.quoteAssetReserve).to.be.closeTo(100026.9031, 0.01);
      expect(ammData.baseAssetReserve).to.be.closeTo(1817.6928, 0.01);
      expect(ammData.quoteAssetWeight).to.be.closeTo(1, 0.001);
      expect(ammData.totalPositionSize).to.be.closeTo(0.489, 0.01);
    }

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

    {
      let ammData = await amm.getAmmData();

      expect(ammData.quoteAssetReserve).to.be.closeTo(99982.0806, 0.01);
      expect(ammData.baseAssetReserve).to.be.closeTo(1818.5077, 0.01);
      expect(ammData.quoteAssetWeight).to.be.closeTo(1, 0.001);
      expect(ammData.totalPositionSize).to.be.closeTo(-0.3259, 0.01);
    }

    expect(tx.stateChanges.transfers[0].amount).to.be.eq(15876342);
  });

  it("Can close short position", async function () {
    let tx = await amm.as(shorter).closePosition();

    {
      let ammData = await amm.getAmmData();

      console.log(`ammData=${JSON.stringify(ammData)}`);

      expect(ammData.quoteAssetReserve).to.be.closeTo(100000, 0.01);
      expect(ammData.baseAssetReserve).to.be.closeTo(1818.1818, 0.01);
      expect(ammData.quoteAssetWeight).to.be.closeTo(1, 0.001);
      expect(ammData.totalPositionSize).to.be.closeTo(0, 0.01);
    }

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

describe("vAMM should ensure 0 PnL for open increase position", async function () {
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
      [longer]: 3000,
    });

    amm = await e.deployAmm(100000, 55, {
      initMarginRatio: 0.1,
      maintenanceMarginRatio: 0.05,
    });

    await Promise.all([
      e.forceSetKeyForSeed(
        e.seeds.amms[amm.address],
        "k_qtAstR",
        3007658618568
      ),
      e.forceSetKeyForSeed(
        e.seeds.amms[amm.address],
        "k_bsAstR",
        1269447541797
      ),
      e.forceSetKeyForSeed(e.seeds.amms[amm.address], "k_qtAstW", 580248),
    ]);
  });

  it("Can open and increase position with 0 PnL", async function () {
    let price = await amm.getMarketPrice();
    await amm.setOraclePrice(price);
    await amm.syncTerminalPriceToOracle();

    console.log(`Market price: ${price}`);

    await amm.as(longer).increasePosition(2000, DIR_LONG, 10);
    {
      let info = await amm.getPositionActualData(longer);
      let ammInfo = await amm.getAmmData();

      console.log(`Open=${JSON.stringify(info)}`);
      console.log(`Open=${JSON.stringify(ammInfo)}`);
      expect(info.unrealizedPnl).to.be.closeTo(0, 0.1, "after open");
    }

    await amm.as(longer).increasePosition(1000, DIR_LONG, 10);
    {
      let info = await amm.getPositionActualData(longer);
      console.log(`Increase=${JSON.stringify(info)}`);
      expect(info.unrealizedPnl).to.be.closeTo(0, 0.1, "after increase");
    }
  });
});
