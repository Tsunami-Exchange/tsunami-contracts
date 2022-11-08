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

describe("vAMM should be able to handle large price impacts", async function () {
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

  it("Can not open long position with large price impact", async function () {
    return expect(amm.as(longer).increasePosition(3000, DIR_LONG, 3, 50)).to
      .eventually.be.rejected;
  });

  it("Can not open short position with large price impact", async function () {
    return expect(amm.as(shorter).increasePosition(3000, DIR_SHORT, 3, 50)).to
      .eventually.be.rejected;
  });

  it("Can open and close long position without large price impact", async function () {
    await amm.as(longer).increasePosition(2500, DIR_LONG, 3, 50);
    await amm.as(longer).closePosition();
  });

  it("Can open and close short position without large price impact", async function () {
    await amm.as(shorter).increasePosition(2500, DIR_SHORT, 3, 50);
    await amm.as(shorter).closePosition();
  });

  it("Can not close long position with large price impact", async function () {
    await amm.as(longer).increasePosition(2500, DIR_LONG, 3, 50);
    await amm.as(longer).increasePosition(2300, DIR_LONG, 3, 50);

    return expect(amm.as(longer).closePosition()).to.eventually.be.rejected;
  });

  it("Can not reduce long position with large price impact", async function () {
    return expect(amm.as(longer).decreasePosition(4000, 3, 50)).to.eventually.be
      .rejected;
  });

  it("Alow long position with large price impact to be gradually reduced", async function () {
    await amm.as(longer).decreasePosition(2300, 3, 50);
    await amm.as(longer).closePosition();
  });

  it("Can not close short position with large price impact", async function () {
    await amm.as(shorter).increasePosition(2500, DIR_SHORT, 3, 50);
    await amm.as(shorter).increasePosition(2300, DIR_SHORT, 3, 50);

    expect(amm.as(shorter).closePosition()).to.eventually.be.rejected;
  });

  it("Can not reduce short position with large price impact", async function () {
    expect(amm.as(shorter).decreasePosition(4000, 3, 50)).to.eventually.be
      .rejected;
  });

  it("Allow short position with large price impact to be gradually reduced", async function () {
    await amm.as(shorter).decreasePosition(2300, 3, 50);
    await amm.as(shorter).closePosition();
  });
});
