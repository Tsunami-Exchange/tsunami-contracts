chai.config.includeStack = true;
chai.use(require("chai-as-promised"));

process.on("unhandledRejection", (error) => {
  console.log("unhandledRejection", JSON.stringify(error));
});

const { expect } = require("chai");
const { Environment } = require("../common/common");
const { decimals, wvs } = require("../common/utils");
const exp = require("constants");

let now = new Date().getTime();

const minute = 1000 * 60;
const hour = minute * 60;

let changes = [
  {
    change: 100,
    rate1: 1.0000333333333333,
    freeBalance1: 300010,
    buffer: 90,
    locked: 33233.33,
    targetBuffer: 9969.999,
  },
  {
    change: -150,
    rate1: 0.9998333333333334,
    freeBalance1: 299950,
    buffer: 0,
    locked: 33383.33,
    targetBuffer: 10014.999,
  },
  {
    change: 300,
    rate1: 0.9999333333333333,
    freeBalance1: 299980,
    buffer: 270,
    locked: 33083.33,
    targetBuffer: 9924.999,
  },
  {
    change: -2250,
    rate1: 0.9933333333333333,
    freeBalance1: 298000,
    buffer: 0,
    locked: 35333.33,
    targetBuffer: 10599.999,
  },
  {
    change: 1500,
    rate1: 0.9938333333333333,
    freeBalance1: 298150,
    buffer: 1350,
    locked: 33833.33,
    targetBuffer: 10149.999,
  },
  {
    change: -200,
    rate1: 0.9938333333333333,
    freeBalance1: 298150,
    buffer: 1150,
    locked: 34033.33,
    targetBuffer: 10209.999,
  },
  {
    change: 1500,
    rate1: 0.9943333333333333,
    freeBalance1: 298300,
    buffer: 2500,
    locked: 32533.33,
    targetBuffer: 9759.999,
  },
  {
    change: 540,
    rate1: 0.9945133333333334,
    freeBalance1: 298354,
    buffer: 2986,
    locked: 31993.33,
    targetBuffer: 9597.999,
  },
  {
    change: 2400,
    rate1: 0.9953133333333334,
    freeBalance1: 298594,
    buffer: 5146,
    locked: 29593.33,
    targetBuffer: 8877.999,
  },
  {
    change: 1800,
    rate1: 0.9959133333333333,
    freeBalance1: 298774,
    buffer: 6766,
    locked: 27793.33,
    targetBuffer: 8337.999,
  },
  {
    change: 1700,
    rate1: 0.99648,
    freeBalance1: 298944,
    buffer: 8296,
    locked: 26093.33,
    targetBuffer: 7827.999,
  },
  {
    change: 1000,
    rate1: 0.99748,
    freeBalance1: 299244,
    buffer: 8996,
    locked: 25093.33,
    targetBuffer: 7527.999,
  },
  {
    change: 1550,
    rate1: 0.99903,
    freeBalance1: 299709,
    buffer: 10081,
    locked: 23543.33,
    targetBuffer: 7062.999000000001,
  },
  {
    change: -300,
    rate1: 0.99903,
    freeBalance1: 299709,
    buffer: 9781,
    locked: 23843.33,
    targetBuffer: 7152.999000000001,
  },
  {
    change: -200,
    rate1: 0.99903,
    freeBalance1: 299709,
    buffer: 9581,
    locked: 24043.33,
    targetBuffer: 7212.999000000001,
  },
];

let changes_free = [
  {
    change: 100,
    rate1: 1.0000333333333333,
    freeBalance1: 300010,
    buffer: 90,
    locked: 33333.33,
    targetBuffer: 9999.999,
  },
  {
    change: 150,
    rate1: 1.0000833333333334,
    freeBalance1: 300025,
    buffer: 225,
    locked: 33333.33,
    targetBuffer: 9999.999,
  },
  {
    change: 300,
    rate1: 1.0001833333333334,
    freeBalance1: 300055,
    buffer: 495,
    locked: 33333.33,
    targetBuffer: 9999.999,
  },
  {
    change: 2250,
    rate1: 1.0009333333333332,
    freeBalance1: 300280,
    buffer: 2520,
    locked: 33333.33,
    targetBuffer: 9999.999,
  },
  {
    change: 1500,
    rate1: 1.0014333333333334,
    freeBalance1: 300430,
    buffer: 3870,
    locked: 33333.33,
    targetBuffer: 9999.999,
  },
  {
    change: 200,
    rate1: 1.0015,
    freeBalance1: 300450,
    buffer: 4050,
    locked: 33333.33,
    targetBuffer: 9999.999,
  },
  {
    change: 1500,
    rate1: 1.002,
    freeBalance1: 300600,
    buffer: 5400,
    locked: 33333.33,
    targetBuffer: 9999.999,
  },
  {
    change: 540,
    rate1: 1.00218,
    freeBalance1: 300654,
    buffer: 5886,
    locked: 33333.33,
    targetBuffer: 9999.999,
  },
  {
    change: 2400,
    rate1: 1.00298,
    freeBalance1: 300894,
    buffer: 8046,
    locked: 33333.33,
    targetBuffer: 9999.999,
  },
  {
    change: 1800,
    rate1: 1.00358,
    freeBalance1: 301074,
    buffer: 9666,
    locked: 33333.33,
    targetBuffer: 9999.999,
  },
  {
    change: 1700,
    rate1: 1.004946001,
    freeBalance1: 301483.8003,
    buffer: 10956.1997,
    locked: 33333.33,
    targetBuffer: 9999.999,
  },
  {
    change: 1000,
    rate1: 1.005946001,
    freeBalance1: 301783.8003,
    buffer: 11656.1997,
    locked: 33333.33,
    targetBuffer: 9999.999,
  },
  {
    change: 1550,
    rate1: 1.007496001,
    freeBalance1: 302248.8003,
    buffer: 12741.1997,
    locked: 33333.33,
    targetBuffer: 9999.999,
  },
  {
    change: 300,
    rate1: 1.007796001,
    freeBalance1: 302338.8003,
    buffer: 12951.1997,
    locked: 33333.33,
    targetBuffer: 9999.999,
  },
  {
    change: 200,
    rate1: 1.007996001,
    freeBalance1: 302398.8003,
    buffer: 13091.1997,
    locked: 33333.33,
    targetBuffer: 9999.999,
  },
];

describe("Vault should allow using buffer when working with free balance", async function () {
  this.timeout(600000);

  let e, staker1, staker2, rewardPayer, amm;

  beforeEach(async function () {
    await setupAccounts({
      admin: 1 * wvs,
      staker1: 0.1 * wvs,
      staker2: 0.1 * wvs,
      rewardPayer: 0.1 * wvs,
      amm: 0.1 * wvs,
    });

    staker1 = accounts.staker1;
    staker2 = accounts.staker2;
    amm = accounts.amm;
    rewardPayer = accounts.rewardPayer;

    /**
     * @type {Environment}
     */
    e = new Environment(accounts.admin);
    await e.deploy();

    await Promise.all([
      e.fundAccounts({ [rewardPayer]: 50000 }),
      e.supplyUsdn(10000, address(staker1)),
      e.supplyUsdn(10000, address(staker2)),
      e.setTime(now),
    ]);

    await e.vault.addFree(300000);
    await e.vault.addLocked(33333.33);

    await e.vault.changeBufferSettings(0.3, 0.9, 0.7);
  });

  it("using exchangeFreeAndLocked", async function () {
    for (let c of changes) {
      console.log(`Applying: ${JSON.stringify(c)}`);

      await e.vault.exchangeFreeAndLocked(-c.change);

      let free = await e.vault.freeBalance();
      let locked = await e.vault.lockedBalance();
      let buffer = await e.vault.bufferBalance();

      expect(free).to.be.closeTo(c.freeBalance1, 0.01);
      expect(buffer).to.be.closeTo(c.buffer, 0.01);
      expect(locked).to.be.closeTo(c.locked, 0.01);
    }
  });

  it("using addFree", async function () {
    for (let c of changes_free) {
      console.log(`Applying: ${JSON.stringify(c)}`);

      await e.vault.addFree(c.change);

      let free = await e.vault.freeBalance();
      let locked = await e.vault.lockedBalance();
      let buffer = await e.vault.bufferBalance();

      expect(free).to.be.closeTo(c.freeBalance1, 0.01);
      expect(buffer).to.be.closeTo(c.buffer, 0.01);
      expect(locked).to.be.closeTo(c.locked, 0.01);
    }
  });
});

describe("Vault should allow using buffer when working with buffer", async function () {
  this.timeout(600000);

  let e, staker1, staker2, rewardPayer, amm;

  before(async function () {
    await setupAccounts({
      admin: 1 * wvs,
      staker1: 0.1 * wvs,
      staker2: 0.1 * wvs,
      rewardPayer: 0.1 * wvs,
      amm: 0.1 * wvs,
    });

    staker1 = accounts.staker1;
    staker2 = accounts.staker2;
    amm = accounts.amm;
    rewardPayer = accounts.rewardPayer;

    /**
     * @type {Environment}
     */
    e = new Environment(accounts.admin);
    await e.deploy();

    await Promise.all([
      e.fundAccounts({ [rewardPayer]: 50000 }),
      e.supplyUsdn(10000, address(staker1)),
      e.supplyUsdn(10000, address(staker2)),
      e.setTime(now),
    ]);

    await e.vault.addFree(300000);
    await e.vault.addLocked(33333.33);

    await e.vault.changeBufferSettings(0.3, 0.9, 0.7);
  });

  it("should allow to deposit to buffer", async function () {
    await e.vault.addBuffer(5000);

    let buffer = await e.vault.bufferBalance();

    expect(buffer).to.be.closeTo(5000, 0.01);
  });

  it("allow withdrawing from buffer", async function () {
    await e.vault.withdrawBuffer(2000);

    let buffer = await e.vault.bufferBalance();

    expect(buffer).to.be.closeTo(3000, 0.01);
  });

  it("allow withdrawing from buffer not more then exists", async function () {
    await expect(e.vault.withdrawBuffer(3100)).to.eventually.be.rejected;
  });

  it("allow withdrawing from buffer as admin only", async function () {
    await expect(e.vault.as(staker1).withdrawBuffer(2900)).to.eventually.be
      .rejected;
  });
});
