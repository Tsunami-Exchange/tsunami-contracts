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

    amm = await e.deployAmm(100000, 55, {
      kind: "coin",
    });
  });

  it("Can open position", async function () {
    {
      let ammData = await amm.getAmmData();

      expect(ammData.quoteAssetReserve).to.be.closeTo(100000, 0.01);
      expect(ammData.baseAssetReserve).to.be.closeTo(1818.1818, 0.01);
      expect(ammData.quoteAssetWeight).to.be.closeTo(1, 0.001);
      expect(ammData.totalPositionSize).to.be.closeTo(0, 0.01);
    }

    // It was 10 dollars, but now, we are opening position for coins, 1 coin = 55$ so $10 = 0.1818
    await amm.as(longer).increasePosition(0.181818, DIR_LONG, 3, 0.15);

    {
      let ammData = await amm.getAmmData();

      expect(ammData.quoteAssetReserve).to.be.closeTo(100029.8924, 0.01);
      expect(ammData.baseAssetReserve).to.be.closeTo(1817.6385, 0.01);
      expect(ammData.quoteAssetWeight).to.be.closeTo(1, 0.001);
      expect(ammData.totalPositionSize).to.be.closeTo(0.5433, 0.01);
    }

    let data = await amm.getPositionActualData(longer);

    expect(data.marginRatio).to.be.closeTo(0.333, 0.001);

    const { size, margin, openNotional } = await amm.getPositionInfo(longer);

    expect(size).to.be.eq(543336);
    expect(margin).to.be.eq(181166);
    expect(openNotional).to.be.eq(29892390);

    const { totalSize, totalLong, totalShort } = await amm.totalPositionInfo();

    expect(totalSize).to.be.eq(543336);
    expect(totalLong).to.be.eq(543336);
    expect(totalShort).to.be.eq(0);
  });

  it("Can increase position", async function () {
    await amm.as(longer).increasePosition(0.090909, DIR_LONG, 3, 0.15);

    {
      let ammData = await amm.getAmmData();

      console.log(JSON.stringify(ammData));

      expect(ammData.quoteAssetReserve).to.be.closeTo(100044.8386, 0.01);
      expect(ammData.baseAssetReserve).to.be.closeTo(1817.3669, 0.01);
      expect(ammData.quoteAssetWeight).to.be.closeTo(1, 0.001);
      expect(ammData.totalPositionSize).to.be.closeTo(0.8149, 0.01);
    }

    let data = await amm.getPositionActualData(longer);

    expect(data.marginRatio).to.be.closeTo(0.333, 0.001);

    const { size, margin, openNotional } = await amm.getPositionInfo(longer);

    expect(size).to.be.eq(814882);
    expect(margin).to.be.eq(271749);
    expect(openNotional).to.be.eq(44838585);

    const { totalSize, totalLong, totalShort } = await amm.totalPositionInfo();

    expect(totalSize).to.be.eq(814882);
    expect(totalLong).to.be.eq(814882);
    expect(totalShort).to.be.eq(0);
  });

  it("Can add margin", async function () {
    await amm.as(longer).addMargin(0.054545);

    {
      let ammData = await amm.getAmmData();

      expect(ammData.quoteAssetReserve).to.be.closeTo(100044.8386, 0.01);
      expect(ammData.baseAssetReserve).to.be.closeTo(1817.3669, 0.01);
      expect(ammData.quoteAssetWeight).to.be.closeTo(1, 0.001);
      expect(ammData.totalPositionSize).to.be.closeTo(0.8149, 0.01);
    }

    const { size, margin, openNotional } = await amm.getPositionInfo(longer);

    expect(size).to.be.eq(814882);
    expect(margin).to.be.eq(326294);
    expect(openNotional).to.be.eq(44838585);
  });

  it("Can remove margin", async function () {
    await amm.as(longer).removeMargin(0.03636);

    {
      let ammData = await amm.getAmmData();

      expect(ammData.quoteAssetReserve).to.be.closeTo(100044.8386, 0.01);
      expect(ammData.baseAssetReserve).to.be.closeTo(1817.3669, 0.01);
      expect(ammData.quoteAssetWeight).to.be.closeTo(1, 0.001);
      expect(ammData.totalPositionSize).to.be.closeTo(0.8149, 0.01);
    }

    const { size, margin, openNotional } = await amm.getPositionInfo(longer);

    expect(size).to.be.eq(814882);
    expect(margin).to.be.eq(289934);
    expect(openNotional).to.be.eq(44838585);
  });

  it("Can not remove too much margin", async function () {
    return expect(amm.as(longer).removeMargin(2)).to.eventually.be.rejected;
  });

  it("Can open short position", async function () {
    await amm.as(shorter).increasePosition(0.090909, DIR_SHORT, 3, 0.15);

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
    expect(margin).to.be.eq(90583);
    expect(openNotional).to.be.eq(14946195);
  });

  it("Can increase short position", async function () {
    await amm.as(shorter).increasePosition(0.01818, DIR_SHORT, 3, 0.04);

    {
      let ammData = await amm.getAmmData();

      expect(ammData.quoteAssetReserve).to.be.closeTo(100026.9031, 0.01);
      expect(ammData.baseAssetReserve).to.be.closeTo(1817.6928, 0.01);
      expect(ammData.quoteAssetWeight).to.be.closeTo(1, 0.001);
      expect(ammData.totalPositionSize).to.be.closeTo(0.489, 0.01);
    }

    const { size, margin, openNotional } = await amm.getPositionInfo(shorter);
    console.log(JSON.stringify({ size, margin, openNotional }));

    expect(size).to.be.eq(-325860);
    expect(margin).to.be.eq(108698);
    expect(openNotional).to.be.eq(17935170);
  });

  it("Can pay funding", async function () {
    await amm.awaitNextFunding();
    await amm.payFunding();
  });

  it("Can close long position", async function () {
    let tx = await amm.as(longer).closePosition();

    {
      let ammData = await amm.getAmmData();

      expect(ammData.quoteAssetReserve).to.be.closeTo(99982.0809, 0.01);
      expect(ammData.baseAssetReserve).to.be.closeTo(1818.5077, 0.01);
      expect(ammData.quoteAssetWeight).to.be.closeTo(1, 0.001);
      expect(ammData.totalPositionSize).to.be.closeTo(-0.3259, 0.01);
    }

    expect(tx.stateChanges.transfers[0].amount).to.be.eq(288664);
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

    expect(tx.stateChanges.transfers[0].amount).to.be.eq(108599);
  });

  it("Can partially close long position", async function () {
    await amm.as(longer).increasePosition(2.72727, DIR_LONG, 3, 0); // 150 / 55 * 3 / 55 ~ = 8.18 base asset

    {
      let info = await amm.getPositionActualData(longer);
      await expect(info.unrealizedPnl).to.be.closeTo(0, 0.001, "after open");
    }

    const p1 = await amm.getPositionInfo(longer);
    console.log(`P1=${JSON.stringify(p1)}`);

    {
      const { size, margin, openNotional } = await amm.getPositionInfo(longer);

      expect(size).to.be.eq(8116070);
      expect(margin).to.be.eq(2717487);
      expect(openNotional).to.be.eq(448385355);
    }

    let ppcTx = await amm.as(longer).closePosition(4, 200);

    {
      let info = await amm.getPositionActualData(longer);
      await expect(info.unrealizedPnl).to.be.closeTo(
        0,
        0.001,
        "after part close"
      );
    }

    {
      const { size, margin, openNotional } = await amm.getPositionInfo(longer);

      expect(size).to.be.eq(4116070);
      expect(margin).to.be.lessThan(2717487);
      expect(margin).to.be.eq(1375135);
      expect(openNotional).to.be.eq(226897510);

      expect(ppcTx.stateChanges.transfers[0].amount).to.be.equal(1337530);
    }

    const p2 = await amm.getPositionInfo(longer);
    console.log(`P2=${JSON.stringify(p2)}`);

    let ppcTx2 = await amm.as(longer).closePosition();

    {
      expect(ppcTx2.stateChanges.transfers[0].amount).to.be.equal(1370185);
    }
  });
});

describe("vAMM in coin settle PnL in coin", async function () {
  this.timeout(600000);

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
      [liquidator]: 100,
    });

    await e.vault.as(liquidator).stake(3);

    amm = await e.deployAmm(100000, 55, {
      kind: "coin",
      initMarginRatio: 0.1,
    });
  });

  it("Can settle long PnL in Base asset", async function () {
    let price = await amm.getMarketPrice();
    await amm.setOraclePrice(price);
    await amm.syncTerminalPriceToOracle();

    console.log(`Market price: ${price}`);

    // Here we opening position for 1 COIN @ 55 x 10 = 55 x 10 = 550 / 55 = ~10 COINS
    await amm.as(longer).increasePosition(1, DIR_LONG, 10);

    await amm.setOraclePrice(75);

    await amm.syncTerminalPriceToOracle();

    // Here COIN has risen to 75. That so 10 COINS PNL is 200
    // But in COIN at 75, PNL is 200 / 75 ~ 2.666
    //
    {
      let info = await amm.getPositionActualData(longer);
      console.log(`Increase=${JSON.stringify(info)}`);
      expect(info.unrealizedPnl).to.be.closeTo(2.635, 0.001, "after increase");
    }

    // This guy should get back his 1 COIN + 2.64 COINS (approx)
    //
    let ppcTx1 = await amm.as(longer).closePosition(5);
    let amount1 = ppcTx1.stateChanges.transfers[0].amount;

    let ppcTx2 = await amm.as(longer).closePosition();
    let amount2 = ppcTx2.stateChanges.transfers[0].amount;

    // Now partially close position and ensure that we got 3.62 in total
    expect((amount1 + amount2) / 10 ** 6).to.be.closeTo(3.62, 0.01);
  });
});
