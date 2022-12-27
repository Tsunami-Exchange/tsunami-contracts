chai.config.includeStack = true;
chai.use(require("chai-as-promised"));

process.on("unhandledRejection", (error) => {
  console.log("unhandledRejection", JSON.stringify(error));
});

const wvs = 10 ** 8;
const DIR_LONG = 1;
const DIR_SHORT = 2;

const { typeToExtension } = require("allure-js-commons/dist/src/writers");
const { expect } = require("chai");
const { Environment } = require("../common/common");
const { decimals } = require("../common/utils");

describe("vAMM should be able to partially close position", async function () {
  this.timeout(600000);

  let e, amm, longer, shorter, liquidator, lp;

  before(async function () {
    await setupAccounts({
      admin: 1 * wvs,
      longer: 0.1 * wvs,
      shorter: 0.1 * wvs,
      liquidator: 0.1 * wvs,
      lp: 0.1 * wvs,
    });

    longer = accounts.longer;
    shorter = accounts.shorter;
    liquidator = accounts.liquidator;
    lp = accounts.lp;

    e = new Environment(accounts.admin);
    await e.deploy();
    await e.fundAccounts({
      [longer]: 10000,
      [shorter]: 10000,
      [lp]: 10000,
    });

    amm = await e.deployAmm(100000, 55);
    await e.vault.as(lp).stake(5000);
  });

  this.beforeEach(async function () {
    await amm.setOraclePrice(55);
    await amm.syncTerminalPriceToOracle();
  });

  it("can partially close position with positive PnL", async function () {
    await amm.as(longer).increasePosition(1000, DIR_LONG, 3);

    await amm.setOraclePrice(65);
    await amm.syncTerminalPriceToOracle();

    // 1549758872 - should be
    // 2109517715
    {
      let { size } = await amm.getPositionActualData(longer);
      let half1 = size / 2;

      console.log(`Position size = ${size}`);
      let tx = await amm.as(longer).closePosition(52442458 / decimals); // Almost 100% close positions
      let amount = tx.stateChanges.transfers[0].amount;

      expect(amount / decimals).to.be.closeTo(1549.7, 0.1);
    }
  });

  it("can partially close position with negative PnL", async function () {
    await amm.as(longer).increasePosition(1000, DIR_LONG, 3);

    await amm.setOraclePrice(45);
    await amm.syncTerminalPriceToOracle();

    // 1549758872 - should be
    // 2109517715
    {
      let { size } = await amm.getPositionActualData(longer);
      let half1 = size / 2;

      console.log(`Position size = ${size}`);
      let tx = await amm.as(longer).closePosition(52442458 / decimals); // Almost 100% close positions
      let amount = tx.stateChanges.transfers[0].amount;

      expect(amount / decimals).to.be.closeTo(436.6, 0.1);
    }
  });
});
