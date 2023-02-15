chai.config.includeStack = true;
chai.use(require("chai-as-promised"));

process.on("unhandledRejection", (error) => {
  console.log("unhandledRejection", JSON.stringify(error));
});

const wvs = 10 ** 8;
const DIR_LONG = 1;
const DIR_SHORT = 2;

const minute = 1000 * 60;
const hour = minute * 60;

const { expect } = require("chai");
const { Environment } = require("../common/common");

// ===============================================================================================================

describe("vAMM should be able to pay funding (asymmetric) (long pays)", async function () {
  this.timeout(600000);

  let e, amm, longer, shorter, liquidator;
  let now = new Date().getTime();

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

    amm = await e.deployAmm(100000, 55, {
      fundingPeriodSeconds: 3600, // 1 hour
    });
  });

  it("Open long positions", async function () {
    console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`);
    await Promise.all([
      amm.as(longer).increasePosition(2000, DIR_LONG, 3, 0),
      amm.as(longer).increasePosition(2000, DIR_LONG, 3, 0),
      amm.as(longer).increasePosition(2000, DIR_LONG, 3, 0),
      amm.as(shorter).increasePosition(1000, DIR_SHORT, 1, 0),
    ]);

    console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`);
    console.log(`AMM Index Price is: ${await amm.getTerminalAmmPrice()}`);
  });

  it("Should compute funding rates", async function () {
    const {
      longFunding,
      shortFunding,
      twapMarketPrice,
      indexPrice,
      premiumToVault,
    } = await amm.getFunding();

    console.log(JSON.stringify({ longFunding }));

    expect(longFunding).to.eq(0.015309);
    expect(shortFunding).to.eq(0.321464);
    expect(twapMarketPrice).to.be.closeTo(75.2, 0.01);
    expect(indexPrice).to.eq(55);
    expect(premiumToVault).to.eq(0);
  });

  it("Should exchange funding", async function () {
    await e.setTime(now + 1 * hour + 1 * minute);
    await amm.payFunding();

    let { fundingPayment: longFundingPayment, size: longSize } =
      await amm.getPositionActualData(longer);
    let { fundingPayment: shortFundingPayment, size: shortSize } =
      await amm.getPositionActualData(shorter);

    console.log(JSON.stringify({ longFundingPayment, longSize }));
    console.log(JSON.stringify({ shortFundingPayment, shortSize }));

    // long should PAY 0.015309 * 55 * positionSize
    // short should GET 0.321464 * 55 * positionSize

    let longExpectPay = 0.015309 * 55 * longSize;
    let shortExpectGet = -(0.321464 * 55 * -shortSize);

    expect(longFundingPayment).to.be.closeTo(longExpectPay, 0.1);
    expect(shortFundingPayment).to.be.closeTo(shortExpectGet, 0.1);

    expect(-shortFundingPayment).to.be.closeTo(longFundingPayment, 0.1);
  });
});

// ===============================================================================================================

describe("vAMM should be able to pay funding (asymmetric) (short pays)", async function () {
  this.timeout(600000);

  let e, amm, longer, shorter, liquidator;
  let now = new Date().getTime();

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

    amm = await e.deployAmm(100000, 55, {
      fundingPeriodSeconds: 3600, // 1 hour
    });
  });

  it("Open long positions", async function () {
    console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`);
    await Promise.all([
      amm.as(shorter).increasePosition(2000, DIR_SHORT, 3, 0),
      amm.as(shorter).increasePosition(2000, DIR_SHORT, 3, 0),
      amm.as(shorter).increasePosition(2000, DIR_SHORT, 3, 0),
      amm.as(longer).increasePosition(1000, DIR_LONG, 1, 0),
    ]);

    console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`);
    console.log(`AMM Index Price is: ${await amm.getTerminalAmmPrice()}`);
  });

  it("Should compute funding rates", async function () {
    const {
      longFunding,
      shortFunding,
      twapMarketPrice,
      indexPrice,
      premiumToVault,
    } = await amm.getFunding();

    console.log(JSON.stringify({ longFunding }));

    expect(longFunding).to.eq(-0.19269);
    expect(shortFunding).to.eq(-0.012919);
    expect(twapMarketPrice).to.be.closeTo(37.9474, 0.01);
    expect(indexPrice).to.eq(55);
    expect(premiumToVault).to.eq(0);
  });

  it("Should exchange funding", async function () {
    await e.setTime(now + 1 * hour + 1 * minute);
    await amm.payFunding();

    let { fundingPayment: longFundingPayment, size: longSize } =
      await amm.getPositionActualData(longer);
    let { fundingPayment: shortFundingPayment, size: shortSize } =
      await amm.getPositionActualData(shorter);

    console.log(JSON.stringify({ longFundingPayment, longSize }));
    console.log(JSON.stringify({ shortFundingPayment, shortSize }));

    // short should PAY 0.012919 * 55 * positionSize
    // long should GET 0.19269 * 55 * positionSize

    let shortExpectPay = 0.012919 * 55 * -shortSize;
    let longExpectGet = -(0.19269 * 55 * longSize);

    expect(longFundingPayment).to.be.closeTo(longExpectGet, 0.1);
    expect(shortFundingPayment).to.be.closeTo(shortExpectPay, 0.1);

    expect(-shortFundingPayment).to.be.closeTo(longFundingPayment, 0.1);
  });
});

// ===============================================================================================================

describe("vAMM should be able to pay funding (symmetric)", async function () {
  this.timeout(600000);

  let e, amm, longer, shorter, liquidator;
  let now = new Date().getTime();

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

    amm = await e.deployAmm(100000, 55, {
      fundingPeriodSeconds: 3600, // 1 hour
      fundingMode: 2, // symmetric
    });
  });

  it("Open long positions", async function () {
    console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`);
    await Promise.all([
      amm.as(longer).increasePosition(2000, DIR_LONG, 3, 0),
      amm.as(longer).increasePosition(2000, DIR_LONG, 3, 0),
      amm.as(longer).increasePosition(2000, DIR_LONG, 3, 0),
      amm.as(shorter).increasePosition(1000, DIR_SHORT, 1, 0),
    ]);

    console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`);
    console.log(`AMM Index Price is: ${await amm.getTerminalAmmPrice()}`);
  });

  it("Should compute funding rates", async function () {
    const {
      longFunding,
      shortFunding,
      twapMarketPrice,
      indexPrice,
      premiumToVault,
    } = await amm.getFunding();

    console.log(JSON.stringify({ longFunding }));

    expect(longFunding).to.eq(0.015309);
    expect(shortFunding).to.eq(0.015309);
    expect(twapMarketPrice).to.be.closeTo(75.2, 0.01);
    expect(indexPrice).to.eq(55);
    expect(premiumToVault).to.eq(221.730447);
  });

  it("Should exchange funding", async function () {
    {
      let lpBalanceBefore = await e.vault.freeBalance();
      expect(lpBalanceBefore).to.be.eq(11.3605); // fees
    }

    await e.setTime(now + 1 * hour + 1 * minute);
    await amm.payFunding();

    {
      let lpBalanceBefore = await e.vault.freeBalance();
      expect(lpBalanceBefore).to.be.closeTo(11.3605 + 221.730447, 0.0001);
    }

    let { fundingPayment: longFundingPayment, size: longSize } =
      await amm.getPositionActualData(longer);
    let { fundingPayment: shortFundingPayment, size: shortSize } =
      await amm.getPositionActualData(shorter);

    console.log(JSON.stringify({ longFundingPayment, longSize }));
    console.log(JSON.stringify({ shortFundingPayment, shortSize }));

    // long should PAY 0.015309 * 55 * positionSize
    // short should GET 0.015309 * 55 * positionSize

    let longExpectPay = 0.015309 * 55 * longSize;
    let shortExpectGet = -(0.015309 * 55 * -shortSize);

    expect(longFundingPayment).to.be.closeTo(longExpectPay, 0.1);
    expect(shortFundingPayment).to.be.closeTo(shortExpectGet, 0.1);

    expect(-shortFundingPayment + 221.730447).to.be.closeTo(
      longFundingPayment,
      0.1
    );
  });
});

// ===============================================================================================================

describe("vAMM should be able to pay funding (symmetric) (short pays)", async function () {
  this.timeout(600000);

  let e, amm, longer, shorter, liquidator;
  let now = new Date().getTime();

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

    amm = await e.deployAmm(100000, 55, {
      fundingPeriodSeconds: 3600, // 1 hour
      fundingMode: 2, // symmetric
    });
  });

  it("Open long positions", async function () {
    console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`);
    await Promise.all([
      amm.as(shorter).increasePosition(2000, DIR_SHORT, 3, 0),
      amm.as(shorter).increasePosition(2000, DIR_SHORT, 3, 0),
      amm.as(shorter).increasePosition(2000, DIR_SHORT, 3, 0),
      amm.as(longer).increasePosition(1000, DIR_LONG, 1, 0),
    ]);

    console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`);
    console.log(`AMM Index Price is: ${await amm.getTerminalAmmPrice()}`);
  });

  it("Should compute funding rates", async function () {
    const {
      longFunding,
      shortFunding,
      twapMarketPrice,
      indexPrice,
      premiumToVault,
    } = await amm.getFunding();

    console.log(JSON.stringify({ longFunding }));

    expect(longFunding).to.eq(-0.012919);
    expect(shortFunding).to.eq(-0.012919);
    expect(twapMarketPrice).to.be.closeTo(37.9474, 0.01);
    expect(indexPrice).to.eq(55);
    expect(premiumToVault).to.eq(263.411524);
  });

  it("Should exchange funding", async function () {
    {
      let lpBalanceBefore = await e.vault.freeBalance();
      expect(lpBalanceBefore).to.be.eq(11.3605); // fees
    }

    await e.setTime(now + 1 * hour + 1 * minute);
    await amm.payFunding();

    {
      let lpBalanceBefore = await e.vault.freeBalance();
      expect(lpBalanceBefore).to.be.closeTo(11.3605 + 263.411524, 0.0001);
    }

    let { fundingPayment: longFundingPayment, size: longSize } =
      await amm.getPositionActualData(longer);
    let { fundingPayment: shortFundingPayment, size: shortSize } =
      await amm.getPositionActualData(shorter);

    console.log(JSON.stringify({ longFundingPayment, longSize }));
    console.log(JSON.stringify({ shortFundingPayment, shortSize }));

    // short should PAY 0.012919 * 55 * positionSize
    // long should GET -0.012919 * 55 * positionSize

    let shortExpectPay = 0.012919 * 55 * -shortSize;
    let longExpectGet = -(0.012919 * 55 * longSize);

    expect(longFundingPayment).to.be.closeTo(longExpectGet, 0.1);
    expect(shortFundingPayment).to.be.closeTo(shortExpectPay, 0.1);

    expect(shortFundingPayment).to.be.closeTo(
      -longFundingPayment + 263.411524,
      0.1
    );
  });
});
