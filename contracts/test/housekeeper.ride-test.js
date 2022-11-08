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

  let e, amm1, housekeeper;

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

    let [_amm1] = await Promise.all([e.deployAmm(100000, 55)]);
    amm1 = _amm1;
    housekeeper = e.housekeeper;
  });

  it("Can pay funding with housekeeper", async function () {
    await amm1.awaitNextFunding();
    await housekeeper.performHousekeeping(amm1.address);
  });
});
