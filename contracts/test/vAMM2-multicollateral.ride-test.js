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

describe("vAMM should work with multi-collateral", async function () {
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
    let [_amm] = await Promise.all([
      e.deployAmm(100000, 55),
      e.fundAccountsUsdt({
        [longer]: 100,
        [shorter]: 100,
      }),
      e.fundAccountsUsdc({
        [longer]: 10,
        [shorter]: 10,
      }),
      e.fundAccounts({
        [longer]: 10,
        [shorter]: 10,
      }),
    ]);

    amm = _amm;
  });

  it("Can open position", async function () {
    await amm
      .as(longer)
      .withAssetId(e.assets.usdt)
      .increasePosition(10, DIR_LONG, 3, 0.15);

    const { size, margin, openNotional } = await amm.getPositionInfo(longer);

    expect(size).to.be.eq(543336);
    expect(margin).to.be.eq(9964129);
    expect(openNotional).to.be.eq(29892387);

    const { totalSize, totalLong, totalShort } = await amm.totalPositionInfo();

    expect(totalSize).to.be.eq(543336);
    expect(totalLong).to.be.eq(543336);
    expect(totalShort).to.be.eq(0);
  });

  it("Can NOT increase position in USDC (Different asset)", async function () {
    return expect(
      amm
        .as(longer)
        .withAssetId(e.assets.usdc)
        .increasePosition(10, DIR_LONG, 3, 0.15)
    ).to.eventually.be.rejected;
  });

  it("Can NOT increase position in USDN (Different asset)", async function () {
    return expect(amm.as(longer).increasePosition(10, DIR_LONG, 3, 0.15)).to
      .eventually.be.rejected;
  });

  it("Can increase position", async function () {
    await amm
      .as(longer)
      .withAssetId(e.assets.usdt)
      .increasePosition(5, DIR_LONG, 3, 0.15);

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
    await amm.as(longer).withAssetId(e.assets.usdt).addMargin(3);

    const { size, margin, openNotional } = await amm.getPositionInfo(longer);

    expect(size).to.be.eq(814882);
    expect(margin).to.be.eq(17946194);
    expect(openNotional).to.be.eq(44838582);
  });

  it("Can NOT add margin in USDC (Different Asset)", async function () {
    return expect(amm.as(longer).withAssetId(e.assets.usdc).addMargin(3)).to
      .eventually.be.rejected;
  });

  it("Can NOT add margin in USDN (Different Asset)", async function () {
    return expect(amm.as(longer).addMargin(3)).to.eventually.be.rejected;
  });

  it("Can remove margin", async function () {
    await amm.as(longer).removeMargin(2);

    const { size, margin, openNotional } = await amm.getPositionInfo(longer);

    expect(size).to.be.eq(814882);
    expect(margin).to.be.eq(15946194);
    expect(openNotional).to.be.eq(44838582);
  });

  it("Can not remove too much margin", async function () {
    return expect(amm.as(longer).removeMargin(11)).to.eventually.be.rejected;
  });

  it("Can open short position", async function () {
    await amm
      .as(shorter)
      .withAssetId(e.assets.usdt)
      .increasePosition(5, DIR_SHORT, 3, 0.15);
  });

  it("Can increase short position", async function () {
    await amm
      .as(shorter)
      .withAssetId(e.assets.usdt)
      .increasePosition(1, DIR_SHORT, 3, 0.04);
  });

  it("Can decrease short position", async function () {
    await amm
      .as(shorter)
      .withAssetId(e.assets.usdt)
      .decreasePosition(1, 3, 0.04);
  });

  it("Can pay funding", async function () {
    await amm.awaitNextFunding();
    await amm.payFunding();
  });

  it("Can close long position", async function () {
    let info = await amm.getPositionActualData(longer);
    console.log(JSON.stringify(info));
    await amm.as(longer).closePosition();
  });

  it("Can close short position", async function () {
    await amm.as(shorter).closePosition();
  });

  it("Validate that insurance is untouched", async function () {
    let balance = await e.insurance.getBalance();
    expect(balance).to.be.greaterThanOrEqual(30);
  });
});

describe("vAMM should work with multi-collateral and borrowing maker USDN to settle on-chain trades", async function () {
  this.timeout(600000);

  let e, amm, longer1, longer2, longer3, maker;

  before(async function () {
    await setupAccounts({
      admin: 1 * wvs,
      longer1: 0.1 * wvs,
      longer2: 0.1 * wvs,
      longer3: 0.1 * wvs,
      maker: 0.1 * wvs,
    });

    longer1 = accounts.longer1;
    longer2 = accounts.longer2;
    longer3 = accounts.longer3;
    maker = accounts.maker;

    e = new Environment(accounts.admin);
    await e.deploy();
    let [_amm] = await Promise.all([
      e.deployAmm(100000, 55),
      e.fundAccountsUsdt({
        [longer1]: 3000,
        [longer2]: 3000,
        [longer3]: 3000,
      }),
      e.fundAccounts({
        [maker]: 500,
      }),
    ]);

    amm = _amm;
  });

  it("Can supply funds as maker", async function () {
    await e.vault.as(maker).stake(500);
  });

  it("Can realize on-chain PnL using borrowed funds from maker", async function () {
    await amm
      .as(longer1)
      .withAssetId(e.assets.usdt)
      .increasePosition(1000, DIR_LONG, 3, 0);

    await amm
      .as(longer2)
      .withAssetId(e.assets.usdt)
      .increasePosition(1000, DIR_LONG, 3, 0);

    await amm
      .as(longer3)
      .withAssetId(e.assets.usdt)
      .increasePosition(1000, DIR_LONG, 3, 0);

    let info = await amm.getPositionActualData(longer1);
    console.log(JSON.stringify(info));

    await amm.as(longer1).closePosition();
  });

  it("Can realize on-chain negative PnL (loss) returning funds to maker", async function () {
    let info = await amm.getPositionActualData(longer2);
    console.log(JSON.stringify(info));

    await amm.as(longer2).closePosition();
  });

  it("Can realize large amount of on-chain negative PnL (loss) returning funds to maker", async function () {
    let info = await amm.getPositionActualData(longer3);
    console.log(JSON.stringify(info));

    await amm.as(longer3).closePosition();
  });

  it("Check that maker is in profit", async function () {
    let stakedUSDN = await e.vault.usdnBalanceOf(maker);
    let realUSDN = await e.manager.usdnBalance();

    console.log(
      JSON.stringify({
        stakedUSDN,
        realUSDN,
      })
    );

    expect(stakedUSDN).to.be.greaterThan(510);
    expect(realUSDN).to.be.greaterThan(510);
  });
});

describe("vAMM should work with multi-collateral and borrowing maker USDN to settle off-chain trades", async function () {
  this.timeout(600000);

  let e, amm, longer1, longer2, longer3, maker;

  before(async function () {
    await setupAccounts({
      admin: 1 * wvs,
      longer1: 0.1 * wvs,
      longer2: 0.1 * wvs,
      longer3: 0.1 * wvs,
      maker: 0.1 * wvs,
    });

    longer1 = accounts.longer1;
    longer2 = accounts.longer2;
    longer3 = accounts.longer3;
    maker = accounts.maker;

    e = new Environment(accounts.admin);
    await e.deploy();
    let [_amm] = await Promise.all([
      e.deployAmm(100000, 55),
      e.fundAccountsUsdt({
        [longer1]: 3000,
        [longer2]: 3000,
        [longer3]: 3000,
      }),
      e.fundAccounts({
        [maker]: 500,
      }),
    ]);

    amm = _amm;
  });

  it("Can supply funds as maker", async function () {
    await e.vault.as(maker).stake(500);
  });

  it("Can realize on-chain PnL using borrowed funds from maker", async function () {
    await amm
      .as(longer1)
      .withAssetId(e.assets.usdt)
      .increasePosition(1000, DIR_LONG, 3, 0);

    await amm
      .as(longer2)
      .withAssetId(e.assets.usdt)
      .increasePosition(1000, DIR_LONG, 3, 0);

    await amm
      .as(longer3)
      .withAssetId(e.assets.usdt)
      .increasePosition(1000, DIR_LONG, 3, 0);

    let info = await amm.getPositionActualData(longer1);
    console.log(JSON.stringify(info));

    {
      let freeUSDN = await e.vault.freeBalance();
      let lockedUSDN = await e.vault.lockedBalance();
      let realUSDN = await e.manager.usdnBalance();
      let borrowedUSDN = await e.vault.freeBorrowedBalance();

      console.log(
        JSON.stringify({
          freeUSDN,
          lockedUSDN,
          borrowedUSDN,
          realUSDN,
        })
      );
    }

    await amm.as(longer1).closePosition();
  });

  it("Can realize on-chain negative PnL (loss) returning funds to maker", async function () {
    let info = await amm.getPositionActualData(longer2);
    console.log(JSON.stringify(info));

    {
      let freeUSDN = await e.vault.freeBalance();
      let lockedUSDN = await e.vault.lockedBalance();
      let realUSDN = await e.manager.usdnBalance();
      let borrowedUSDN = await e.vault.freeBorrowedBalance();

      console.log(
        JSON.stringify({
          freeUSDN,
          lockedUSDN,
          borrowedUSDN,
          realUSDN,
        })
      );
    }

    await amm.as(longer2).closePosition();
  });

  it("Can compensate large amount of on-chain negative PnL (loss) by off-chain price raise", async function () {
    {
      let freeUSDN = await e.vault.freeBalance();
      let lockedUSDN = await e.vault.lockedBalance();
      let realUSDN = await e.manager.usdnBalance();
      let borrowedUSDN = await e.vault.freeBorrowedBalance();

      console.log(
        `Before adjust=` +
          JSON.stringify({
            freeUSDN,
            lockedUSDN,
            borrowedUSDN,
            realUSDN,
          })
      );
    }

    await amm.setOraclePrice(61.7);
    await amm.syncTerminalPriceToOracle();

    let info = await amm.getPositionActualData(longer3);
    console.log(JSON.stringify(info));

    {
      let freeUSDN = await e.vault.freeBalance();
      let lockedUSDN = await e.vault.lockedBalance();
      let realUSDN = await e.manager.usdnBalance();
      let borrowedUSDN = await e.vault.freeBorrowedBalance();

      console.log(
        JSON.stringify({
          freeUSDN,
          lockedUSDN,
          borrowedUSDN,
          realUSDN,
        })
      );
    }

    await amm.as(longer3).closePosition();
  });

  it("Check that maker is in profit", async function () {
    let freeUSDN = await e.vault.freeBalance();
    let lockedUSDN = await e.vault.lockedBalance();
    let realUSDN = await e.manager.usdnBalance();
    let borrowedUSDN = await e.vault.freeBorrowedBalance();

    console.log(
      JSON.stringify({
        freeUSDN,
        lockedUSDN,
        borrowedUSDN,
        realUSDN,
      })
    );

    expect(realUSDN).to.be.greaterThan(183);
  });
});
