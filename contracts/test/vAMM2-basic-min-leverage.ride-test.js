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

describe("vAMM should work with minimum leverage", async function () {
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
      minInitMarginRatio: 0.5, // Minimum x2 leverage
    });
  });

  it("Can open position with leverage > minLeverage", async function () {
    await amm.as(longer).increasePosition(10, DIR_LONG, 3, 0.15);
    await amm.as(longer).closePosition();
  });

  it("Can not open position with leverage < minLeverage", async function () {
    await expect(amm.as(longer).increasePosition(10, DIR_LONG, 1.5, 0.15)).to.be
      .eventually.rejected;
  });

  it("Can not add margin so leverage < minLeverage", async function () {
    await amm.as(longer).increasePosition(10, DIR_LONG, 3, 0.15);
    await expect(amm.as(longer).addMargin(10)).to.be.eventually.rejected;
    await amm.as(longer).closePosition();
  });

  it("Can add margin if leverage > minLeverage", async function () {
    await amm.as(longer).increasePosition(10, DIR_LONG, 3, 0.15);
    await amm.as(longer).addMargin(1);
    await amm.as(longer).closePosition();
  });
});
