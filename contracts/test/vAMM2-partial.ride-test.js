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

describe("vAMM should be able to partially close position", async function () {
  this.timeout(600000);

  let e, amm, longer, shorter, liquidator, lp;

  before(async function () {
    await setupAccounts({
      admin: 5 * wvs,
      longer: 5 * wvs,
      shorter: 5 * wvs,
      liquidator: 5 * wvs,
      lp: 5 * wvs,
    });

    longer = accounts.longer;
    shorter = accounts.shorter;
    liquidator = accounts.liquidator;
    lp = accounts.lp;

    e = new Environment(accounts.admin);
    await e.deploy();
    await e.fundAccounts({
      [longer]: 100000,
      [shorter]: 100000,
      [lp]: 100000,
    });

    amm = await e.deployAmm(1000000000, 55);
    await e.vault.as(lp).stake(15000);
  });

  this.beforeEach(async function () {
    await amm.setOraclePrice(55);
    await amm.syncTerminalPriceToOracle();
  });

  it("can partially close long position with positive PnL", async function () {
    await amm.as(longer).increasePosition(1000, DIR_LONG, 3);

    await amm.setOraclePrice(65);
    await amm.syncTerminalPriceToOracle();

    // 1549758872 - should be
    // 2109517715
    {
      let { size } = await amm.getPositionActualData(longer);

      console.log(`Position size = ${size}`);
      let tx = await amm.as(longer).closePosition(52442458 / decimals); // Almost 100% close positions
      let amount = tx.stateChanges.transfers[0].amount;

      expect(amount / decimals).to.be.closeTo(1481.8, 0.1);
    }

    await amm.as(longer).closePosition();

    let notional = await amm.getOpenNotional();
    console.log(JSON.stringify(notional));

    expect(notional.longNotional).to.be.closeTo(0, 0.01);
    expect(notional.shortNotional).to.be.closeTo(0, 0.01);
  });

  it("can partially close long position with negative PnL", async function () {
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

      expect(amount / decimals).to.be.closeTo(434.2, 0.1);
    }

    await amm.as(longer).closePosition();

    let notional = await amm.getOpenNotional();
    console.log(JSON.stringify(notional));

    expect(notional.longNotional).to.be.closeTo(0, 0.01);
    expect(notional.shortNotional).to.be.closeTo(0, 0.01);
  });

  it("can partially close short position with negative PnL", async function () {
    await amm.as(shorter).increasePosition(1000, DIR_SHORT, 3);

    await amm.setOraclePrice(60);
    await amm.syncTerminalPriceToOracle();

    // 1549758872 - should be
    // 2109517715
    {
      let { size } = await amm.getPositionActualData(shorter);

      console.log(`Position size = ${size}`);
      let closeAmount = Math.abs(size) - 0.00001;
      console.log(`Close amount = ${closeAmount}`);
      let tx = await amm.as(shorter).closePosition(closeAmount); // Almost 100% close positions
      let amount = tx.stateChanges.transfers[0].amount;

      expect(amount / decimals).to.be.closeTo(720.75, 0.1);
    }

    await amm.as(shorter).closePosition();

    let notional = await amm.getOpenNotional();
    console.log(JSON.stringify(notional));

    expect(notional.longNotional).to.be.closeTo(0, 0.01);
    expect(notional.shortNotional).to.be.closeTo(0, 0.01);
  });

  it("can partially close long position in steps with negative PnL", async function () {
    await amm.as(longer).increasePosition(1000, DIR_LONG, 3);

    {
      let before = await amm.getPositionActualData(longer);
      console.log(`1=${JSON.stringify(before)}`);
    }

    await amm.setOraclePrice(50);
    await amm.syncTerminalPriceToOracle();

    {
      let before = await amm.getPositionActualData(longer);
      console.log(`2=${JSON.stringify(before)}`);
    }

    {
      let { size } = await amm.getPositionActualData(longer);
      let half1 = size / 2;

      let tx1 = await amm.as(longer).closePosition(half1); // 50% close positions
      let amount1 = tx1.stateChanges.transfers[0].amount;

      console.log(`1 Got ${amount1 / decimals}`);
    }

    {
      let before = await amm.getPositionActualData(longer);
      console.log(`3=${JSON.stringify(before)}`);

      expect(before.margin).to.be.closeTo(362.3, 0.1);
      expect(before.leverage).to.be.closeTo(3, 0.01);
      expect(before.size).to.be.closeTo(27.17, 0.01);
      expect(before.openNotional).to.be.closeTo(1494.61, 0.01);
      expect(before.positionalNotional).to.be.closeTo(1358.74, 0.01);
    }

    await amm.setOraclePrice(58);
    await amm.syncTerminalPriceToOracle();

    {
      let before = await amm.getPositionActualData(longer);
      console.log(`4=${JSON.stringify(before)}`);
    }

    let tx2 = await amm.as(longer).closePosition();
    let amount2 = tx2.stateChanges.transfers[0].amount;

    console.log(`2 Got ${amount2 / decimals}`);

    let notional = await amm.getOpenNotional();
    console.log(JSON.stringify(notional));

    expect(notional.longNotional).to.be.closeTo(0, 0.01);
    expect(notional.shortNotional).to.be.closeTo(0, 0.01);
  });

  it("can partially close short position in steps with negative PnL", async function () {
    await amm.as(shorter).increasePosition(1000, DIR_SHORT, 3);

    {
      let before = await amm.getPositionActualData(shorter);
      console.log(`1=${JSON.stringify(before)}`);
    }

    await amm.setOraclePrice(60);
    await amm.syncTerminalPriceToOracle();

    {
      let before = await amm.getPositionActualData(shorter);
      console.log(`2=${JSON.stringify(before)}`);
    }

    {
      let { size } = await amm.getPositionActualData(shorter);
      let half1 = size / 2;

      let tx1 = await amm.as(shorter).closePosition(Math.abs(half1)); // 50% close positions
      let amount1 = tx1.stateChanges.transfers[0].amount;

      console.log(`1 Got ${amount1 / decimals}`);
    }

    {
      let before = await amm.getPositionActualData(shorter);
      console.log(`3=${JSON.stringify(before)}`);

      expect(before.leverage).to.be.closeTo(3, 0.01);
    }

    await amm.setOraclePrice(58);
    await amm.syncTerminalPriceToOracle();

    {
      let before = await amm.getPositionActualData(shorter);
      console.log(`4=${JSON.stringify(before)}`);
    }

    let tx2 = await amm.as(shorter).closePosition();
    let amount2 = tx2.stateChanges.transfers[0].amount;

    console.log(`2 Got ${amount2 / decimals}`);

    let notional = await amm.getOpenNotional();
    console.log(JSON.stringify(notional));

    expect(notional.longNotional).to.be.closeTo(0, 0.01);
    expect(notional.shortNotional).to.be.closeTo(0, 0.01);
  });

  it("can partially close long position in profit with multiple iterations", async function () {
    await amm.as(longer).increasePosition(1000, DIR_LONG, 3);
    await amm.setOraclePrice(63);
    await amm.syncTerminalPriceToOracle();

    {
      let before = await amm.getPositionActualData(longer);
      console.log(`REF=${JSON.stringify(before)}`);
    }

    let tx1 = await amm.as(longer).closePosition();
    let ref = tx1.stateChanges.transfers[0].amount;

    console.log(`+++ Closed ref position with ${ref / decimals}`);

    await amm.setOraclePrice(55);
    await amm.syncTerminalPriceToOracle();
    await amm.as(longer).increasePosition(1000, DIR_LONG, 3);
    await amm.setOraclePrice(63);
    await amm.syncTerminalPriceToOracle();

    let sum = 0;
    let { size } = await amm.getPositionActualData(longer);
    let part = size / 9;

    {
      let before = await amm.getPositionActualData(longer);
      console.log(`${0}=${JSON.stringify(before)}`);
    }

    for (let i = 0; i < 9; i++) {
      let { size } = await amm.getPositionActualData(longer);
      let actualPart = Math.min(Math.abs(size), Math.abs(part));
      let tx1 = await amm.as(longer).closePosition(actualPart);
      let amount1 = tx1.stateChanges.transfers[0].amount;
      sum += amount1;

      console.log(`+++ Closed part of position with ${amount1 / decimals}`);

      {
        if (i != 8) {
          let before = await amm.getPositionActualData(longer);
          console.log(`${i + 1}=${JSON.stringify(before)}`);
        }
      }
    }

    expect(ref / decimals).to.be.closeTo(sum / decimals, 0.1);

    let notional = await amm.getOpenNotional();
    console.log(JSON.stringify(notional));

    expect(notional.longNotional).to.be.closeTo(0, 0.01);
    expect(notional.shortNotional).to.be.closeTo(0, 0.01);
  });

  it("can partially close long position in loss with multiple iterations", async function () {
    await amm.as(longer).increasePosition(1000, DIR_LONG, 3);
    await amm.setOraclePrice(50);
    await amm.syncTerminalPriceToOracle();

    {
      let before = await amm.getPositionActualData(longer);
      console.log(`REF=${JSON.stringify(before)}`);
    }

    let tx1 = await amm.as(longer).closePosition();
    let ref = tx1.stateChanges.transfers[0].amount;

    console.log(`+++ Closed ref position with ${ref / decimals}`);

    await amm.setOraclePrice(55);
    await amm.syncTerminalPriceToOracle();
    await amm.as(longer).increasePosition(1000, DIR_LONG, 3);
    await amm.setOraclePrice(50);
    await amm.syncTerminalPriceToOracle();

    let sum = 0;
    let { size } = await amm.getPositionActualData(longer);
    let part = size / 9;

    {
      let before = await amm.getPositionActualData(longer);
      console.log(`${0}=${JSON.stringify(before)}`);
    }

    for (let i = 0; i < 9; i++) {
      let { size } = await amm.getPositionActualData(longer);
      let actualPart = Math.min(Math.abs(size), Math.abs(part));
      let tx1 = await amm.as(longer).closePosition(actualPart);
      let amount1 = tx1.stateChanges.transfers[0].amount;
      sum += amount1;

      console.log(`+++ Closed part of position with ${amount1 / decimals}`);

      {
        if (i != 8) {
          let before = await amm.getPositionActualData(longer);
          console.log(`${i + 1}=${JSON.stringify(before)}`);
        }
      }
    }

    expect(ref / decimals).to.be.closeTo(sum / decimals, 0.1);

    let notional = await amm.getOpenNotional();
    console.log(JSON.stringify(notional));

    expect(notional.longNotional).to.be.closeTo(0, 0.01);
    expect(notional.shortNotional).to.be.closeTo(0, 0.01);
  });

  it("can partially close short position in profit with multiple iterations", async function () {
    await amm.as(shorter).increasePosition(1000, DIR_SHORT, 3);
    await amm.setOraclePrice(50);
    await amm.syncTerminalPriceToOracle();

    {
      let before = await amm.getPositionActualData(shorter);
      console.log(`REF=${JSON.stringify(before)}`);
    }

    let tx1 = await amm.as(shorter).closePosition();
    let ref = tx1.stateChanges.transfers[0].amount;

    console.log(`+++ Closed ref position with ${ref / decimals}`);

    await amm.setOraclePrice(55);
    await amm.syncTerminalPriceToOracle();
    await amm.as(shorter).increasePosition(1000, DIR_SHORT, 3);
    await amm.setOraclePrice(50);
    await amm.syncTerminalPriceToOracle();

    let sum = 0;
    let { size } = await amm.getPositionActualData(shorter);
    let part = size / 9;

    {
      let before = await amm.getPositionActualData(shorter);
      console.log(`${0}=${JSON.stringify(before)}`);
    }

    for (let i = 0; i < 9; i++) {
      let { size } = await amm.getPositionActualData(shorter);
      let actualPart = Math.min(Math.abs(size), Math.abs(part));
      let tx1 = await amm.as(shorter).closePosition(actualPart);
      let amount1 = tx1.stateChanges.transfers[0].amount;
      sum += amount1;

      console.log(`+++ Closed part of position with ${amount1 / decimals}`);

      {
        if (i != 8) {
          let before = await amm.getPositionActualData(shorter);
          console.log(`${i + 1}=${JSON.stringify(before)}`);
        }
      }
    }

    expect(ref / decimals).to.be.closeTo(sum / decimals, 0.1);

    let notional = await amm.getOpenNotional();
    console.log(JSON.stringify(notional));

    expect(notional.longNotional).to.be.closeTo(0, 0.01);
    expect(notional.shortNotional).to.be.closeTo(0, 0.01);
  });

  it("can partially close short position in loss with multiple iterations", async function () {
    await amm.as(shorter).increasePosition(1000, DIR_SHORT, 3);
    await amm.setOraclePrice(63);
    await amm.syncTerminalPriceToOracle();

    {
      let before = await amm.getPositionActualData(shorter);
      console.log(`REF=${JSON.stringify(before)}`);
    }

    let tx1 = await amm.as(shorter).closePosition();
    let ref = tx1.stateChanges.transfers[0].amount;

    console.log(`+++ Closed ref position with ${ref / decimals}`);

    await amm.setOraclePrice(55);
    await amm.syncTerminalPriceToOracle();
    await amm.as(shorter).increasePosition(1000, DIR_SHORT, 3);
    await amm.setOraclePrice(63);
    await amm.syncTerminalPriceToOracle();

    let sum = 0;
    let { size } = await amm.getPositionActualData(shorter);
    let part = size / 9;

    {
      let before = await amm.getPositionActualData(shorter);
      console.log(`${0}=${JSON.stringify(before)}`);
    }

    for (let i = 0; i < 9; i++) {
      let { size } = await amm.getPositionActualData(shorter);
      let actualPart = Math.min(Math.abs(size), Math.abs(part));
      let tx1 = await amm.as(shorter).closePosition(actualPart);
      let amount1 = tx1.stateChanges.transfers[0].amount;
      sum += amount1;

      console.log(`+++ Closed part of position with ${amount1 / decimals}`);

      {
        if (i != 8) {
          let before = await amm.getPositionActualData(shorter);
          console.log(`${i + 1}=${JSON.stringify(before)}`);
        }
      }
    }

    expect(ref / decimals).to.be.closeTo(sum / decimals, 0.1);

    let notional = await amm.getOpenNotional();
    console.log(JSON.stringify(notional));

    expect(notional.longNotional).to.be.closeTo(0, 0.01);
    expect(notional.shortNotional).to.be.closeTo(0, 0.01);
  });

  it("can partially liquidate short position and bring notional down", async function () {
    await amm.as(shorter).increasePosition(1000, DIR_SHORT, 3);
    await amm.setOraclePrice(69);

    await amm.as(liquidator).liquidate(shorter);
    await amm.as(liquidator).liquidate(shorter);

    await amm.as(shorter).closePosition();

    let notional = await amm.getOpenNotional();
    console.log(JSON.stringify(notional));

    expect(notional.longNotional).to.be.closeTo(0, 0.01);
    expect(notional.shortNotional).to.be.closeTo(0, 0.01);
  });

  it("can partially liquidate long position and bring notional down", async function () {
    await amm.as(longer).increasePosition(1000, DIR_LONG, 3);
    await amm.setOraclePrice(38);

    await amm.as(liquidator).liquidate(longer);
    await amm.as(liquidator).liquidate(longer);

    await amm.as(longer).closePosition();

    let notional = await amm.getOpenNotional();
    console.log(JSON.stringify(notional));

    expect(notional.longNotional).to.be.closeTo(0, 0.01);
    expect(notional.shortNotional).to.be.closeTo(0, 0.01);
  });

  it("can partially reduce short position in loss with multiple iterations", async function () {
    await amm.as(shorter).increasePosition(1000, DIR_SHORT, 3);
    await amm.setOraclePrice(63);
    await amm.syncTerminalPriceToOracle();

    {
      let before = await amm.getPositionActualData(shorter);
      console.log(`REF=${JSON.stringify(before)}`);
    }

    let tx1 = await amm.as(shorter).closePosition();
    let ref = tx1.stateChanges.transfers[0].amount;

    console.log(`+++ Closed ref position with ${ref / decimals}`);

    await amm.setOraclePrice(55);
    await amm.syncTerminalPriceToOracle();
    await amm.as(shorter).increasePosition(1000, DIR_SHORT, 3);
    await amm.setOraclePrice(63);
    await amm.syncTerminalPriceToOracle();

    let sum = 0;
    let { size } = await amm.getPositionActualData(shorter);
    let part = size / 9;

    {
      let before = await amm.getPositionActualData(shorter);
      console.log(`${0}=${JSON.stringify(before)}`);
    }

    for (let i = 0; i < 9; i++) {
      let { size } = await amm.getPositionActualData(shorter);
      let actualPart = Math.min(Math.abs(size), Math.abs(part));
      if (i == 8) {
        actualPart = Math.abs(size);
      }
      let tx1 = await amm.as(shorter).closePosition(actualPart, 0, true); // Reduce position

      console.log(`Tx=${tx1.id}`);

      if (i == 8) {
        let amount1 = tx1.stateChanges.transfers[0].amount;
        sum += amount1;

        expect(tx1.stateChanges.transfers.length).to.be.equal(
          2,
          "Should transfer to trader"
        );
      } else {
        expect(tx1.stateChanges.transfers.length).to.be.equal(
          1,
          "No transfers on reduce"
        );
      }

      {
        if (i != 8) {
          let before = await amm.getPositionActualData(shorter);
          console.log(`${i + 1}=${JSON.stringify(before)}`);
        }
      }
    }

    expect(ref / decimals).to.be.closeTo(sum / decimals, 0.1);

    let notional = await amm.getOpenNotional();
    console.log(JSON.stringify(notional));

    expect(notional.longNotional).to.be.closeTo(0, 0.01);
    expect(notional.shortNotional).to.be.closeTo(0, 0.01);
  });
});
