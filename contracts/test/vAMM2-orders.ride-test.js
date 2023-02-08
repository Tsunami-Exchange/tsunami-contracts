chai.config.includeStack = true;
chai.use(require("chai-as-promised"));

process.on("unhandledRejection", (error) => {
  console.log("unhandledRejection", JSON.stringify(error));
});

const wvs = 10 ** 8;
const DIR_LONG = 1;
const DIR_SHORT = 2;

const STOP_LOSS = 1;
const TAKE_PROFIT = 2;
const LIMIT = 3;

const minute = 1000 * 60;
const hour = minute * 60;
const day = hour * 24;

const { expect } = require("chai");
const { Environment } = require("../common/common");
const { decimals } = require("../common/utils");

describe("Should execute TAKE profit orders on LONG position", async function () {
  this.timeout(600000);

  let e, amm, longer, user, shorter, executor, lp;
  let _orderId;

  before(async function () {
    await setupAccounts({
      admin: 1 * wvs,
      longer: 0.1 * wvs,
      user: 0.1 * wvs,
      lp: 0.1 * wvs,
      shorter: 0.1 * wvs,
      executor: 0.2 * wvs,
    });

    longer = accounts.longer;
    shorter = accounts.shorter;
    executor = accounts.executor;
    user = accounts.user;
    lp = accounts.lp;

    e = new Environment(accounts.admin);
    await e.deploy();
    await e.fundAccounts({
      [longer]: 50000,
      [shorter]: 50000,
      [user]: 50000,
      [lp]: 100000,
    });

    amm = await e.deployAmm(1000000, 55);

    await e.vault.as(lp).stake(100000);
  });

  it("Can open position", async function () {
    await amm.as(longer).increasePosition(1000, DIR_LONG, 3, 50);
  });

  it("Can create take profit order", async function () {
    let [orderId] = await e.orders
      .as(longer)
      .createOrder(
        amm.address,
        TAKE_PROFIT,
        67.0,
        0,
        e.orders.FULL_POSITION,
        0,
        DIR_SHORT
      );

    _orderId = orderId;

    console.log(`orderId=${orderId}`);
    console.log(`orderId=${orderId}`);

    expect(_orderId).to.not.be.undefined;
  });

  it("Can not execute take profit order when price <= TP price", async function () {
    return expect(e.orders.as(executor).executeOrder(1)).to.be.eventually
      .rejected;
  });

  it("Can execute take profit order when price >= TP price", async function () {
    await amm.setOraclePrice(67.1);
    await amm.syncTerminalPriceToOracle();

    await e.orders.as(executor).executeOrder(_orderId);
  });

  it("Can not create take profit order without position", async function () {
    expect(
      e.orders
        .as(longer)
        .createOrder(amm.address, TAKE_PROFIT, 67.0, 0, 11, 0, DIR_SHORT)
    ).to.eventually.be.rejected;
  });

  it("Can create and execute take profit order with size > positionSize", async function () {
    await amm.setOraclePrice(55.0);
    await amm.syncTerminalPriceToOracle();

    await amm.as(longer).increasePosition(1000, DIR_LONG, 3, 50);

    let [order1] = await e.orders
      .as(longer)
      .createOrder(amm.address, TAKE_PROFIT, 67.0, 0, 30, 0, DIR_SHORT);

    let [order2] = await e.orders
      .as(longer)
      .createOrder(amm.address, TAKE_PROFIT, 75.0, 0, 30, 0, DIR_SHORT);

    await amm.setOraclePrice(67.1);
    await amm.syncTerminalPriceToOracle();

    await e.orders.as(executor).executeOrder(order1);
    await expect(e.orders.as(executor).executeOrder(order1)).to.eventually.be
      .rejected;

    await amm.setOraclePrice(75.3);
    await amm.syncTerminalPriceToOracle();

    await e.orders.as(executor).executeOrder(order2);
  });

  it("Can cancel take profit order", async function () {
    await amm.setOraclePrice(55.0);
    await amm.syncTerminalPriceToOracle();

    await amm.as(longer).increasePosition(1000, DIR_LONG, 3, 50);

    let [orderId] = await e.orders
      .as(longer)
      .createOrder(
        amm.address,
        TAKE_PROFIT,
        45.0,
        0,
        e.orders.FULL_POSITION,
        0,
        DIR_SHORT
      );

    await e.orders.as(longer).cancelOrder(orderId);
    _orderId = orderId;
  });

  it("Can not execute cancelled take profit order", async function () {
    return expect(e.orders.as(executor).executeOrder(_orderId)).to.be.eventually
      .rejected;
  });

  it("Can not execute take profit order on different position", async function () {
    await amm.as(longer).increasePosition(1000, DIR_LONG, 3, 50);

    let [orderId] = await e.orders
      .as(longer)
      .createOrder(
        amm.address,
        TAKE_PROFIT,
        45.0,
        0,
        e.orders.FULL_POSITION,
        0,
        DIR_SHORT
      );

    await amm.as(longer).closePosition();
    await amm.as(longer).increasePosition(1000, DIR_LONG, 3, 50);

    return expect(e.orders.as(executor).executeOrder(orderId)).to.be.eventually
      .rejected;
  });
});

describe("Should execute TAKE profit orders on SHORT position", async function () {
  this.timeout(600000);

  let e, amm, longer, user, shorter, executor, lp;
  let _orderId;

  before(async function () {
    await setupAccounts({
      admin: 1 * wvs,
      longer: 0.1 * wvs,
      user: 0.1 * wvs,
      lp: 0.1 * wvs,
      shorter: 0.1 * wvs,
      executor: 0.2 * wvs,
    });

    longer = accounts.longer;
    shorter = accounts.shorter;
    executor = accounts.executor;
    user = accounts.user;
    lp = accounts.lp;

    e = new Environment(accounts.admin);
    await e.deploy();
    await e.fundAccounts({
      [longer]: 50000,
      [shorter]: 50000,
      [user]: 50000,
      [lp]: 100000,
    });

    amm = await e.deployAmm(1000000, 55);

    await e.vault.as(lp).stake(100000);
  });

  it("Can open position", async function () {
    await amm.as(shorter).increasePosition(1000, DIR_SHORT, 3, 50);
  });

  it("Can create take profit order", async function () {
    let [orderId] = await e.orders
      .as(shorter)
      .createOrder(
        amm.address,
        TAKE_PROFIT,
        47.0,
        0,
        e.orders.FULL_POSITION,
        0,
        DIR_LONG
      );

    _orderId = orderId;
  });

  it("Can not execute take profit order when price >= TP price", async function () {
    return expect(e.orders.as(executor).executeOrder(1)).to.be.eventually
      .rejected;
  });

  it("Can execute take profit order when price <= TP price", async function () {
    await amm.setOraclePrice(46.9);
    await amm.syncTerminalPriceToOracle();

    await e.orders.as(executor).executeOrder(_orderId);
  });

  it("Can not create take profit order without position", async function () {
    expect(
      e.orders
        .as(shorter)
        .createOrder(amm.address, TAKE_PROFIT, 47.0, 0, 11, 0, DIR_LONG)
    ).to.eventually.be.rejected;
  });

  it("Can create and execute take profit order with size > positionSize", async function () {
    await amm.setOraclePrice(55.0);
    await amm.syncTerminalPriceToOracle();

    await amm.as(shorter).increasePosition(1000, DIR_SHORT, 3, 50);

    let [order1] = await e.orders
      .as(shorter)
      .createOrder(amm.address, TAKE_PROFIT, 47.0, 0, 30, 0, DIR_LONG);

    let [order2] = await e.orders
      .as(shorter)
      .createOrder(amm.address, TAKE_PROFIT, 35.0, 0, 30, 0, DIR_LONG);

    await amm.setOraclePrice(46.9);
    await amm.syncTerminalPriceToOracle();

    await e.orders.as(executor).executeOrder(order1);
    await expect(e.orders.as(executor).executeOrder(order1)).to.eventually.be
      .rejected;

    await amm.setOraclePrice(34.6);
    await amm.syncTerminalPriceToOracle();

    await e.orders.as(executor).executeOrder(order2);
  });

  it("Can cancel take profit order", async function () {
    await amm.setOraclePrice(55.0);
    await amm.syncTerminalPriceToOracle();

    await amm.as(shorter).increasePosition(1000, DIR_SHORT, 3, 50);

    let [orderId] = await e.orders
      .as(shorter)
      .createOrder(
        amm.address,
        TAKE_PROFIT,
        35.0,
        0,
        e.orders.FULL_POSITION,
        0,
        DIR_LONG
      );

    await e.orders.as(shorter).cancelOrder(orderId);
    _orderId = orderId;
  });

  it("Can not execute cancelled take profit order", async function () {
    return expect(e.orders.as(executor).executeOrder(_orderId)).to.be.eventually
      .rejected;
  });

  it("Can not execute take profit order on different position", async function () {
    await amm.as(shorter).increasePosition(1000, DIR_SHORT, 3, 50);

    let [orderId] = await e.orders
      .as(shorter)
      .createOrder(
        amm.address,
        TAKE_PROFIT,
        55.0,
        0,
        e.orders.FULL_POSITION,
        0,
        DIR_LONG
      );

    await amm.as(shorter).closePosition();
    await amm.as(shorter).increasePosition(1000, DIR_SHORT, 3, 50);

    return expect(e.orders.as(executor).executeOrder(orderId)).to.be.eventually
      .rejected;
  });
});

describe("Should execute STOP loss orders on LONG position", async function () {
  this.timeout(600000);

  let e, amm, longer, user, shorter, executor, lp;
  let _orderId;

  before(async function () {
    await setupAccounts({
      admin: 1 * wvs,
      longer: 0.1 * wvs,
      user: 0.1 * wvs,
      lp: 0.1 * wvs,
      shorter: 0.1 * wvs,
      executor: 0.2 * wvs,
    });

    longer = accounts.longer;
    shorter = accounts.shorter;
    executor = accounts.executor;
    user = accounts.user;
    lp = accounts.lp;

    e = new Environment(accounts.admin);
    await e.deploy();
    await e.fundAccounts({
      [longer]: 50000,
      [shorter]: 50000,
      [user]: 50000,
      [lp]: 100000,
    });

    amm = await e.deployAmm(1000000, 55);

    await e.vault.as(lp).stake(100000);
  });

  it("Can open position", async function () {
    await amm.as(longer).increasePosition(1000, DIR_LONG, 3, 50);
  });

  it("Can create stop loss order", async function () {
    let [orderId] = await e.orders
      .as(longer)
      .createOrder(
        amm.address,
        STOP_LOSS,
        47.5,
        0,
        e.orders.FULL_POSITION,
        0,
        DIR_SHORT
      );

    _orderId = orderId;
  });

  it("Can not execute stop loss order when price >= SL price", async function () {
    return expect(e.orders.as(executor).executeOrder(1)).to.be.eventually
      .rejected;
  });

  it("Can execute stop loss order when price <= SL price", async function () {
    await amm.setOraclePrice(46.9);
    await amm.syncTerminalPriceToOracle();

    await e.orders.as(executor).executeOrder(_orderId);
  });

  it("Can not create stop loss order without position", async function () {
    expect(
      e.orders
        .as(longer)
        .createOrder(amm.address, STOP_LOSS, 47.5, 0, 11, 0, DIR_SHORT)
    ).to.eventually.be.rejected;
  });

  it("Can create and execute stop loss order with size > positionSize", async function () {
    await amm.setOraclePrice(55.0);
    await amm.syncTerminalPriceToOracle();

    await amm.as(longer).increasePosition(1000, DIR_LONG, 3, 50);

    let [order1] = await e.orders
      .as(longer)
      .createOrder(amm.address, STOP_LOSS, 47.5, 0, 30, 0, DIR_SHORT);

    let [order2] = await e.orders
      .as(longer)
      .createOrder(amm.address, STOP_LOSS, 43.5, 0, 30, 0, DIR_SHORT);

    await amm.setOraclePrice(46.9);
    await amm.syncTerminalPriceToOracle();

    await e.orders.as(executor).executeOrder(order1);
    await expect(e.orders.as(executor).executeOrder(order1)).to.eventually.be
      .rejected;

    await amm.setOraclePrice(43.0);
    await amm.syncTerminalPriceToOracle();

    await e.orders.as(executor).executeOrder(order2);
  });

  it("Can cancel stop loss order", async function () {
    await amm.setOraclePrice(55.0);
    await amm.syncTerminalPriceToOracle();

    await amm.as(longer).increasePosition(1000, DIR_LONG, 3, 50);

    let [orderId] = await e.orders
      .as(longer)
      .createOrder(
        amm.address,
        STOP_LOSS,
        65.0,
        0,
        e.orders.FULL_POSITION,
        0,
        DIR_SHORT
      );

    await e.orders.as(longer).cancelOrder(orderId);
    _orderId = orderId;
  });

  it("Can not execute cancelled stop loss order", async function () {
    return expect(e.orders.as(executor).executeOrder(_orderId)).to.be.eventually
      .rejected;
  });

  it("Can not execute stop loss order on different position", async function () {
    await amm.as(longer).increasePosition(1000, DIR_LONG, 3, 50);

    let [orderId] = await e.orders
      .as(longer)
      .createOrder(
        amm.address,
        STOP_LOSS,
        65.0,
        0,
        e.orders.FULL_POSITION,
        0,
        DIR_SHORT
      );

    await amm.as(longer).closePosition();
    await amm.as(longer).increasePosition(1000, DIR_LONG, 3, 50);

    return expect(e.orders.as(executor).executeOrder(orderId)).to.be.eventually
      .rejected;
  });
});

describe("Should execute STOP loss orders on SHORT position", async function () {
  this.timeout(600000);

  let e, amm, longer, user, shorter, executor, lp;
  let _orderId;

  before(async function () {
    await setupAccounts({
      admin: 1 * wvs,
      longer: 0.1 * wvs,
      user: 0.1 * wvs,
      lp: 0.1 * wvs,
      shorter: 0.1 * wvs,
      executor: 0.2 * wvs,
    });

    longer = accounts.longer;
    shorter = accounts.shorter;
    executor = accounts.executor;
    user = accounts.user;
    lp = accounts.lp;

    e = new Environment(accounts.admin);
    await e.deploy();
    await e.fundAccounts({
      [longer]: 50000,
      [shorter]: 50000,
      [user]: 50000,
      [lp]: 100000,
    });

    amm = await e.deployAmm(1000000, 55);

    await e.vault.as(lp).stake(100000);
  });

  it("Can open position", async function () {
    await amm.as(shorter).increasePosition(1000, DIR_SHORT, 3, 50);
  });

  it("Can create stop loss order", async function () {
    let [orderId] = await e.orders
      .as(shorter)
      .createOrder(
        amm.address,
        STOP_LOSS,
        60.0,
        0,
        e.orders.FULL_POSITION,
        0,
        DIR_LONG
      );

    _orderId = orderId;
  });

  it("Can not execute stop loss order when price <= TP price", async function () {
    return expect(e.orders.as(executor).executeOrder(1)).to.be.eventually
      .rejected;
  });

  it("Can execute stop loss order when price >= TP price", async function () {
    await amm.setOraclePrice(61.0);
    await amm.syncTerminalPriceToOracle();

    await e.orders.as(executor).executeOrder(_orderId);
  });

  it("Can not create stop loss order without position", async function () {
    expect(
      e.orders
        .as(shorter)
        .createOrder(amm.address, STOP_LOSS, 56.0, 0, 11, 0, DIR_LONG)
    ).to.eventually.be.rejected;
  });

  it("Can create and execute stop loss order with size > positionSize", async function () {
    await amm.setOraclePrice(55.0);
    await amm.syncTerminalPriceToOracle();

    await amm.as(shorter).increasePosition(1000, DIR_SHORT, 3, 50);

    let [order1] = await e.orders
      .as(shorter)
      .createOrder(amm.address, STOP_LOSS, 60.0, 0, 30, 0, DIR_LONG);

    let [order2] = await e.orders
      .as(shorter)
      .createOrder(amm.address, STOP_LOSS, 65.0, 0, 30, 0, DIR_LONG);

    await amm.setOraclePrice(61.0);
    await amm.syncTerminalPriceToOracle();

    await e.orders.as(executor).executeOrder(order1);
    await expect(e.orders.as(executor).executeOrder(order1)).to.eventually.be
      .rejected;

    await amm.setOraclePrice(66.0);
    await amm.syncTerminalPriceToOracle();

    await e.orders.as(executor).executeOrder(order2);
  });

  it("Can cancel stop loss order", async function () {
    await amm.setOraclePrice(55.0);
    await amm.syncTerminalPriceToOracle();

    await amm.as(shorter).increasePosition(1000, DIR_SHORT, 3, 50);

    let [orderId] = await e.orders
      .as(shorter)
      .createOrder(
        amm.address,
        STOP_LOSS,
        45.0,
        0,
        e.orders.FULL_POSITION,
        0,
        DIR_LONG
      );

    await e.orders.as(shorter).cancelOrder(orderId);
    _orderId = orderId;
  });

  it("Can not execute cancelled take profit order", async function () {
    return expect(e.orders.as(executor).executeOrder(_orderId)).to.be.eventually
      .rejected;
  });

  it("Can not execute take profit order on different position", async function () {
    await amm.as(shorter).increasePosition(1000, DIR_SHORT, 3, 50);

    let [orderId] = await e.orders
      .as(shorter)
      .createOrder(
        amm.address,
        STOP_LOSS,
        45.0,
        0,
        e.orders.FULL_POSITION,
        0,
        DIR_LONG
      );

    await amm.as(shorter).closePosition();
    await amm.as(shorter).increasePosition(1000, DIR_SHORT, 3, 50);

    return expect(e.orders.as(executor).executeOrder(orderId)).to.be.eventually
      .rejected;
  });
});

describe.skip("LIMIT order should be able to", async function () {
  this.timeout(600000);

  let e, amm, longer, user, shorter, executor, lp;
  let _orderId;

  before(async function () {
    await setupAccounts({
      admin: 1 * wvs,
      longer: 0.1 * wvs,
      user: 0.1 * wvs,
      lp: 0.1 * wvs,
      shorter: 0.1 * wvs,
      executor: 0.2 * wvs,
    });

    longer = accounts.longer;
    shorter = accounts.shorter;
    executor = accounts.executor;
    user = accounts.user;
    lp = accounts.lp;

    e = new Environment(accounts.admin);
    await e.deploy();
    await e.fundAccounts({
      [longer]: 50000,
      [shorter]: 50000,
      [user]: 50000,
      [lp]: 100000,
    });

    amm = await e.deployAmm(1000000000, 55);

    await e.vault.as(lp).stake(100000);
  });

  it("open a new LONG position", async function () {
    let [orderId] = await e.orders
      .as(longer)
      .createOrder(amm.address, LIMIT, 57.0, 0, 1000, 3, DIR_LONG, 1000);

    {
      let [can] = await e.orders.canExecute(orderId);
      expect(can).to.be.false;
    }

    await expect(e.orders.as(executor).executeOrder(orderId)).to.be.eventually
      .rejected;

    await amm.setOraclePrice(57.15);
    await amm.syncTerminalPriceToOracle();

    {
      let [can] = await e.orders.canExecute(orderId);
      expect(can).to.be.true;
    }

    await e.orders.as(executor).executeOrder(orderId);

    await amm.as(longer).closePosition();
  });

  it("open a new SHORT position", async function () {
    await amm.setOraclePrice(55.0);
    await amm.syncTerminalPriceToOracle();

    let [orderId] = await e.orders
      .as(shorter)
      .createOrder(amm.address, LIMIT, 53.0, 0, 1000, 3, DIR_LONG, 1000);

    {
      let [can] = await e.orders.canExecute(orderId);
      expect(can).to.be.false;
    }

    await expect(e.orders.as(executor).executeOrder(orderId)).to.be.eventually
      .rejected;

    await amm.setOraclePrice(53.01);
    await amm.syncTerminalPriceToOracle();

    {
      let [can] = await e.orders.canExecute(orderId);
      expect(can).to.be.true;
    }

    await e.orders.as(executor).executeOrder(orderId);

    await amm.as(shorter).closePosition();
  });

  it("reduce a LONG position", async function () {
    await amm.setOraclePrice(55.0);
    await amm.syncTerminalPriceToOracle();

    await amm.as(longer).increasePosition(1000, DIR_LONG, 3);

    let [orderId] = await e.orders
      .as(longer)
      .createOrder(
        amm.address,
        LIMIT,
        57.0,
        0,
        e.orders.FULL_POSITION,
        3,
        DIR_SHORT
      );

    {
      let [can] = await e.orders.canExecute(orderId);
      expect(can).to.be.false;
    }

    await expect(e.orders.as(executor).executeOrder(orderId)).to.be.eventually
      .rejected;

    await amm.setOraclePrice(57.02);
    await amm.syncTerminalPriceToOracle();
    let price = await amm.getMarketPrice();

    console.log(`Price = ${price}`);

    {
      let [can] = await e.orders.canExecute(orderId);
      expect(can).to.be.true;
    }

    await e.orders.as(executor).executeOrder(orderId);
  });

  it("can not reduce a LONG position with USDN payment", async function () {
    await amm.setOraclePrice(55.0);
    await amm.syncTerminalPriceToOracle();

    await amm.as(longer).increasePosition(1000, DIR_LONG, 3);

    let [orderId] = await e.orders
      .as(longer)
      .createOrder(
        amm.address,
        LIMIT,
        57.0,
        0,
        e.orders.FULL_POSITION,
        3,
        DIR_SHORT,
        1000
      );

    {
      let [can] = await e.orders.canExecute(orderId);
      expect(can).to.be.false;
    }

    await expect(e.orders.as(executor).executeOrder(orderId)).to.be.eventually
      .rejected;

    await amm.setOraclePrice(57.02);
    await amm.syncTerminalPriceToOracle();

    let price = await amm.getMarketPrice();

    console.log(`Price = ${price}`);

    {
      let [can] = await e.orders.canExecute(orderId);
      expect(can).to.be.true;
    }

    await expect(e.orders.as(executor).executeOrder(orderId)).to.be.eventually
      .rejected;

    await amm.as(longer).closePosition();
  });
});

describe("Should be able to use a helper", async function () {
  this.timeout(600000);

  let e, amm, longer, user, shorter, executor, lp;
  let _orderId;

  before(async function () {
    await setupAccounts({
      admin: 1 * wvs,
      longer: 0.1 * wvs,
      user: 0.1 * wvs,
      lp: 0.1 * wvs,
      shorter: 0.1 * wvs,
      executor: 0.2 * wvs,
    });

    longer = accounts.longer;
    shorter = accounts.shorter;
    executor = accounts.executor;
    user = accounts.user;
    lp = accounts.lp;

    e = new Environment(accounts.admin);
    await e.deploy();
    await e.fundAccounts({
      [longer]: 50000,
      [shorter]: 50000,
      [user]: 50000,
      [lp]: 100000,
    });

    amm = await e.deployAmm(1000000, 55);

    await e.vault.as(lp).stake(100000);
  });

  it("Can create order with helper", async function () {
    let x = await e.orders
      .as(shorter)
      .increasePositionWithStopLoss(
        amm.address,
        1000,
        DIR_SHORT,
        3,
        50,
        "",
        55,
        0,
        50,
        0
      );

    console.log(x.id);

    let cnt = await e.orders.getOrderCount(address(shorter), amm.address);
    expect(cnt).to.be.equal(2);
  });

  it("Can create order with helper", async function () {
    await amm.as(shorter).closePosition(); // so both old orders should be cancelled on new opening
    let x = await e.orders
      .as(shorter)
      .increasePositionWithStopLoss(
        amm.address,
        1000,
        DIR_SHORT,
        3,
        50,
        "",
        55,
        0,
        50,
        0
      );

    console.log(x.id);
    let cnt = await e.orders.getOrderCount(address(shorter), amm.address);
    expect(cnt).to.be.equal(2); // should clean up both stale orders
  });
});

describe("Should be to reset order counter", async function () {
  this.timeout(600000);

  let e, amm, longer, user, shorter, executor, lp;

  before(async function () {
    await setupAccounts({
      admin: 1 * wvs,
      longer: 0.1 * wvs,
      user: 0.1 * wvs,
      lp: 0.1 * wvs,
      shorter: 0.1 * wvs,
      executor: 0.2 * wvs,
    });

    longer = accounts.longer;
    shorter = accounts.shorter;
    executor = accounts.executor;
    user = accounts.user;
    lp = accounts.lp;

    e = new Environment(accounts.admin);
    await e.deploy();
    await e.fundAccounts({
      [longer]: 50000,
      [shorter]: 50000,
      [user]: 50000,
      [lp]: 100000,
    });

    amm = await e.deployAmm(1000000, 55);

    await e.vault.as(lp).stake(100000);
  });

  it("Will decrement order count", async function () {
    await amm.as(longer).increasePosition(1000, DIR_LONG, 3, 50);

    let [orderId1] = await e.orders
      .as(longer)
      .createOrder(
        amm.address,
        STOP_LOSS,
        57.0,
        0,
        e.orders.FULL_POSITION,
        0,
        DIR_SHORT
      );

    let [orderId2] = await e.orders
      .as(longer)
      .createOrder(
        amm.address,
        STOP_LOSS,
        57.0,
        0,
        e.orders.FULL_POSITION,
        0,
        DIR_SHORT
      );

    let cnt1 = await e.orders.getOrderCount(address(longer), amm.address);
    expect(cnt1).to.be.equal(2);

    await e.orders.executeOrder(orderId1);
    let cnt2 = await e.orders.getOrderCount(address(longer), amm.address);
    expect(cnt2).to.be.equal(1);

    await amm.as(longer).increasePosition(1000, DIR_LONG, 3, 50);

    let [_] = await e.orders
      .as(longer)
      .createOrder(
        amm.address,
        STOP_LOSS,
        57.0,
        0,
        e.orders.FULL_POSITION,
        0,
        DIR_SHORT
      );

    let cnt3 = await e.orders.getOrderCount(address(longer), amm.address);
    expect(cnt3).to.be.equal(1);
  });
});
