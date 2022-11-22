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

describe("vAMM should work with positive funding", async function () {
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
      [longer]: 100,
      [shorter]: 100,
    });

    amm = await e.deployAmm(100000, 55);
  });

  it("Can add insurance funds", async function () {
    let addInsuranceFundsTx = await e.insurance.deposit(1);

    console.log("Added insurance funds by " + addInsuranceFundsTx.id);
  });

  it("Opening and closing positions should change balance", async function () {
    await amm.as(longer).increasePosition(10, DIR_LONG, 3, 0.15);

    let balanceIn = await amm.getBalance();
    expect(balanceIn).to.be.eq(9.9);

    await amm.as(longer).closePosition();

    let balanceOut = await amm.getBalance();
    expect(balanceOut).to.be.eq(0);
  });
});
