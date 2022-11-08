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

  it("Can add insurance funds", async function () {
    let addInsuranceFundsTx = await e.insurance.deposit(30);

    console.log("Added insurance funds by " + addInsuranceFundsTx.id);
  });

  it("Can open position", async function () {
    await amm
      .as(longer)
      .withAssetId(e.assets.usdt)
      .increasePosition(10, DIR_LONG, 3, 0.15);

    const { size, margin, openNotional } = await amm.getPositionInfo(longer);

    expect(size).to.be.eq(539840);
    expect(margin).to.be.eq(9900000);
    expect(openNotional).to.be.eq(29700000);

    const { totalSize, totalLong, totalShort } = await amm.totalPositionInfo();

    expect(totalSize).to.be.eq(539840);
    expect(totalLong).to.be.eq(539840);
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
    await amm.as(longer).withAssetId(e.assets.usdt).addMargin(3);

    const { size, margin, openNotional } = await amm.getPositionInfo(longer);

    expect(size).to.be.eq(646135);
    expect(margin).to.be.eq(17820007);
    expect(openNotional).to.be.eq(35550007);
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

    //const {amount, assetId} = await amm.getBorrow(longer)
    //expect(amount).to.be.equal(8 * decimals)
    //expect(assetId).to.be.equal(e.assets.usdt)

    const { size, margin, openNotional } = await amm.getPositionInfo(longer);

    expect(size).to.be.eq(646135);
    expect(margin).to.be.eq(15820007);
    expect(openNotional).to.be.eq(35550007);
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
