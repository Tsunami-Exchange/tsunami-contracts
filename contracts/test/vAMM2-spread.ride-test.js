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

describe("vAMM should not be able to go more than 40% off index price", async function () {
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

    amm = await e.deployAmm(100000, 55);
  });

  it("Open long positions until impact", async function () {
    console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`);
    await Promise.all([
      amm.as(longer).increasePosition(2000, DIR_LONG, 3, 0),
      amm.as(longer).increasePosition(2000, DIR_LONG, 3, 0),
      amm.as(longer).increasePosition(2000, DIR_LONG, 3, 0),
    ]);

    console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`);
  });

  it("Not allows long positions after impact", async function () {
    return expect(amm.as(longer).increasePosition(2000, DIR_LONG, 3, 0)).to
      .eventually.be.rejected;
  });

  it("Allows closing long position", async function () {
    await Promise.all([
      amm.as(longer).decreasePosition(2000, 3, 0),
      amm.as(longer).decreasePosition(2000, 3, 0),
    ]);
    await amm.as(longer).closePosition();
  });

  it("Open short positions until impact", async function () {
    console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`);
    await Promise.all([
      amm.as(shorter).increasePosition(2000, DIR_SHORT, 3, 0),
      amm.as(shorter).increasePosition(2000, DIR_SHORT, 3, 0),
      amm.as(shorter).increasePosition(2000, DIR_SHORT, 3, 0),
    ]);
    console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`);
  });

  it("Not allows short positions after impact", async function () {
    return expect(amm.as(shorter).increasePosition(2000, DIR_SHORT, 3, 0)).to
      .eventually.be.rejected;
  });

  it("Allows closing short position", async function () {
    await Promise.all([
      amm.as(shorter).decreasePosition(2000, 3, 0),
      amm.as(shorter).decreasePosition(2000, 3, 0),
    ]);
    await amm.as(shorter).closePosition();
  });
});
