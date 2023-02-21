chai.config.includeStack = true;
chai.use(require("chai-as-promised"));

process.on("unhandledRejection", (error) => {
  console.log("unhandledRejection", JSON.stringify(error));
});

const wvs = 10 ** 8;
const DIR_LONG = 1;
const DIR_SHORT = 2;

const { Environment } = require("../common/common");

describe("vAMM should be able to adjust liquidity", async function () {
  this.timeout(600000);

  let e, amm, attacker1, attacker2, defender1, liquidator;

  before(async function () {
    await setupAccounts({
      admin: 1 * wvs,
      attacker1: 0.1 * wvs,
      attacker2: 0.1 * wvs,
      defender1: 0.1 * wvs,
      liquidator: 0.1 * wvs,
    });

    attacker1 = accounts.attacker1;
    attacker2 = accounts.attacker2;
    defender1 = accounts.defender1;
    liquidator = accounts.liquidator;

    e = new Environment(accounts.admin);
    await e.deploy();
    await e.fundAccounts({
      [attacker1]: 100000,
      [attacker2]: 100000,
      [defender1]: 100000,
    });

    amm = await e.deployAmm(227605, 6.061196, {
      maxPriceImpact: 100,
    });
  });

  it("Attacker 1 shorts 15,000", async function () {
    console.log(`---- Attacker 1 shorts 15,000 ----`);
    console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`);
    await amm.as(attacker1).increasePosition(15000, DIR_SHORT, 3, 3);

    console.log(
      `attacker1 = ${JSON.stringify(
        await amm.getPositionActualData(attacker1)
      )}`
    );
    console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`);
    console.log(`Insurance balance: ${await e.insurance.getBalance()}`);
    console.log(`---- Attacker 1 shorts 15,000 ----`);
  });

  it("Attacker 2 shorts 10,000", async function () {
    console.log(`---- Attacker 2 shorts 10,000 ----`);
    await amm.as(attacker2).increasePosition(10000, DIR_SHORT, 3, 3);

    console.log(
      `attacker1 = ${JSON.stringify(
        await amm.getPositionActualData(attacker1)
      )}`
    );
    console.log(
      `attacker2 = ${JSON.stringify(
        await amm.getPositionActualData(attacker2)
      )}`
    );
    console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`);
    console.log(`Insurance balance: ${await e.insurance.getBalance()}`);
    console.log(`---- Attacker 2 shorts 10,000 ----`);
  });

  it("Attacker 1 shorts 13,400", async function () {
    console.log(`---- Attacker 1 shorts 13,400 ----`);
    await amm.as(attacker1).increasePosition(13400, DIR_SHORT, 3, 3);

    console.log(
      `attacker1 = ${JSON.stringify(
        await amm.getPositionActualData(attacker1)
      )}`
    );
    console.log(
      `attacker2 = ${JSON.stringify(
        await amm.getPositionActualData(attacker2)
      )}`
    );
    console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`);
    console.log(`Insurance balance: ${await e.insurance.getBalance()}`);
    console.log(`---- Attacker 1 shorts 13,400 ----`);
  });

  it("Defender longs 2000", async function () {
    console.log(`---- Defender longs 2000 ----`);
    await amm.as(defender1).increasePosition(2000, DIR_LONG, 3, 3);

    console.log(
      `attacker1 = ${JSON.stringify(
        await amm.getPositionActualData(attacker1)
      )}`
    );
    console.log(
      `attacker2 = ${JSON.stringify(
        await amm.getPositionActualData(attacker2)
      )}`
    );
    console.log(
      `defender1 = ${JSON.stringify(
        await amm.getPositionActualData(defender1)
      )}`
    );
    console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`);
    console.log(`Insurance balance: ${await e.insurance.getBalance()}`);
    console.log(`---- Defender longs 2000 ----`);
  });

  it("Attacker 1 closes", async function () {
    console.log(`---- Attacker 1 closes ----`);
    await amm.as(attacker1).closePosition();

    console.log(
      `attacker2 = ${JSON.stringify(
        await amm.getPositionActualData(attacker2)
      )}`
    );
    console.log(
      `defender1 = ${JSON.stringify(
        await amm.getPositionActualData(defender1)
      )}`
    );
    console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`);
    console.log(`Insurance balance: ${await e.insurance.getBalance()}`);
    console.log(`---- Attacker 1 closes ----`);
  });

  it("Attacker 2 is liquidated", async function () {
    console.log(`---- Attacker 2 is liquidated ----`);
    await amm.as(liquidator).liquidate(attacker2);

    console.log(
      `defender1 = ${JSON.stringify(
        await amm.getPositionActualData(defender1)
      )}`
    );
    console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`);
    console.log(`Insurance balance: ${await e.insurance.getBalance()}`);
    console.log(`---- Attacker 2 is liquidated ----`);
  });

  it("Defender 1 closes", async function () {
    console.log(`---- Defender 1 closes ----`);
    await amm.as(defender1).closePosition();

    console.log(`AMM Market Price is: ${await amm.getMarketPrice()}`);
    console.log(`Insurance balance: ${await e.insurance.getBalance()}`);
    console.log(`---- Defender 1 closes ----`);
  });
});
