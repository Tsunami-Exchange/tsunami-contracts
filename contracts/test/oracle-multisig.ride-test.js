chai.config.includeStack = true;
chai.use(require("chai-as-promised"));

process.on("unhandledRejection", (error) => {
  console.log("unhandledRejection", JSON.stringify(error));
});

const wvs = 10 ** 8;
const decimals = 10 ** 6;
const DIR_LONG = 1;

const { expect } = require("chai");
const { Environment } = require("../common/common");

let sec = 1000;

const signData = (_signers, _data) => {
  let data = _data.join(",");
  let signatures = _signers.map((s) => {
    let sig = signBytes(s, new TextEncoder().encode(data));
    return `${publicKey(s)}=${sig}`;
  });

  return signatures.join(":");
};

let seeds = ["A", "B", "C", "D", "E"];

describe("Oracle should be able", async function () {
  this.timeout(600000);

  let e, user, user2;

  before(async function () {
    await setupAccounts({
      admin: 1 * wvs,
      user: 0.1 * wvs,
      user2: 0.1 * wvs,
      user3: 0.1 * wvs,
    });

    user = accounts.user;
    user2 = accounts.user2;

    e = new Environment(accounts.admin);
    await e.deploy();
  });

  it("can create stream", async function () {
    await e.oracle.createStream("BTC", 0.05 * 10 ** 6, 10 * 1000);
    await e.oracle.setOraclePublicKeys(seeds.map((s) => publicKey(s)));
  });

  it("can update stream data with all valid signatures (first data point)", async function () {
    let now = new Date().getTime();
    await e.setTime(now);

    let data = [
      "BTC",
      now + 10 * sec,
      Math.round(27870.831 * decimals),
      Math.round(11.11 * decimals),
    ];
    let signature = signData(seeds, data);

    let update = [...data, signature].join("__");

    let tx = await e.oracle.updateData(update);
    console.log(tx.id);

    let { price, timestamp } = await e.oracle.getStreamData("BTC");

    expect(price).to.be.eq(Math.round(27870.831 * decimals));
    expect(timestamp).to.be.eq(now + 10 * sec);
  });

  it("can update stream data with 3 valid signature (second data point same block)", async function () {
    let now = e.now;

    let data = [
      "BTC",
      now + 11 * sec,
      Math.round(27890.111 * decimals),
      Math.round(10.11 * decimals),
    ];
    let signature = signData(["A", "B", "C"], data);

    let update = [...data, signature].join("__");

    let tx = await e.oracle.updateData(update);
    console.log(tx.id);

    let { price, timestamp } = await e.oracle.getStreamData("BTC");

    expect(price).to.be.eq(Math.round(27890.111 * decimals));
    expect(timestamp).to.be.eq(now + 11 * sec);
  });

  it("can update stream data with 3 valid signature + 2 invalid (second data point same block)", async function () {
    let now = e.now;

    let data = [
      "BTC",
      now + 11 * sec,
      Math.round(27890.111 * decimals),
      Math.round(10.11 * decimals),
    ];
    let signature = signData(["A", "B", "C", "X", "Y"], data);

    let update = [...data, signature].join("__");

    let tx = await e.oracle.updateData(update);
    console.log(tx.id);

    let { price, timestamp } = await e.oracle.getStreamData("BTC");

    expect(price).to.be.eq(Math.round(27890.111 * decimals));
    expect(timestamp).to.be.eq(now + 11 * sec);
  });

  it("can update stream data with valid signature (prev block)", async function () {
    let now = e.now;
    let nextBlock = now + 60 * sec;
    await e.setTime(nextBlock);

    console.log(`block=${nextBlock} timestamp=${nextBlock - 8 * sec}`);

    let data = [
      "BTC",
      nextBlock - 8 * sec,
      Math.round(27891.111 * decimals),
      Math.round(09.11 * decimals),
    ];
    let signature = signData(seeds, data);

    let update = [...data, signature].join("__");

    let tx = await e.oracle.updateData(update);
    console.log(tx.id);

    let { price, timestamp } = await e.oracle.getStreamData("BTC");

    expect(price).to.be.eq(Math.round(27891.111 * decimals));
    expect(timestamp).to.be.eq(nextBlock - 8 * sec);
  });

  it("can NOT update stream with stale data", async function () {
    let now = e.now;
    let nextBlock = now + 60 * sec;
    await e.setTime(nextBlock);

    console.log(`block=${nextBlock} timestamp=${nextBlock - 8 * sec}`);

    let data = [
      "BTC",
      nextBlock - 11 * sec,
      Math.round(27891.111 * decimals),
      Math.round(09.11 * decimals),
    ];
    let signature = signData(seeds, data);

    let update = [...data, signature].join("__");

    await expect(e.oracle.updateData(update)).to.eventually.be.rejected;
  });

  it("can NOT update stream with invalid (2 valid 3 invalid) signatures", async function () {
    let now = e.now;
    let nextBlock = now + 60 * sec;
    await e.setTime(nextBlock);

    console.log(`block=${nextBlock} timestamp=${nextBlock - 8 * sec}`);

    let data = [
      "BTC",
      nextBlock - 8 * sec,
      Math.round(27891.111 * decimals),
      Math.round(09.11 * decimals),
    ];
    let signature = signData(["A", "B", "X", "Y", "Z"], data);

    let update = [...data, signature].join("__");

    await expect(e.oracle.updateData(update)).to.eventually.be.rejected;
  });

  it("can NOT update stream with invalid stream id", async function () {
    let now = e.now;
    let nextBlock = now + 60 * sec;
    await e.setTime(nextBlock);

    console.log(`block=${nextBlock} timestamp=${nextBlock - 8 * sec}`);

    let data = [
      "ETH",
      nextBlock - 1 * sec,
      Math.round(27891.111 * decimals),
      Math.round(09.11 * decimals),
    ];
    let signature = signData(seeds, data);

    let update = [...data, signature].join("__");

    await expect(e.oracle.updateData(update)).to.eventually.be.rejected;
  });

  it("can NOT update stream with invalid stream id", async function () {
    let now = e.now;
    let nextBlock = now + 60 * sec;
    await e.setTime(nextBlock);

    console.log(`block=${nextBlock} timestamp=${nextBlock - 8 * sec}`);

    let data = [
      "ETH",
      nextBlock - 1 * sec,
      Math.round(27891.111 * decimals),
      Math.round(09.11 * decimals),
    ];
    let signature = signData(seeds, data);

    let update = [...data, signature].join("__");

    await expect(e.oracle.updateData(update)).to.eventually.be.rejected;
  });

  it("can NOT update stream with large deviation", async function () {
    let now = e.now;
    let nextBlock = now + 60 * sec;
    await e.setTime(nextBlock);

    console.log(`block=${nextBlock} timestamp=${nextBlock - 8 * sec}`);

    let data = [
      "ETH",
      nextBlock - 1 * sec,
      Math.round(37891.111 * decimals),
      Math.round(09.11 * decimals),
    ];
    let signature = signData(seeds, data);

    let update = [...data, signature].join("__");

    await expect(e.oracle.updateData(update)).to.eventually.be.rejected;
  });

  it("can NOT update paused stream", async function () {
    let now = e.now;
    let nextBlock = now + 60 * sec;
    await e.setTime(nextBlock);

    console.log(`block=${nextBlock} timestamp=${nextBlock - 8 * sec}`);

    let data = [
      "BTC",
      nextBlock + 1 * sec,
      Math.round(27891.111 * decimals),
      Math.round(09.11 * decimals),
    ];
    let signature = signData(seeds, data);

    let update = [...data, signature].join("__");

    await e.oracle.pause("BTC");
    await expect(e.oracle.updateData(update)).to.eventually.be.rejected;

    await e.oracle.unPause("BTC");

    let tx = await e.oracle.updateData(update);
    console.log(tx.id);
  });
});

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
      [longer]: 170,
      [shorter]: 100,
    });

    amm = await e.deployAmm(100000, 55, {
      jitOracleStream: "BTC",
      maxOracleDelay: 0, // Current block only
    });

    await e.oracle.setOraclePublicKeys(seeds.map((s) => publicKey(s)));
    e.oracle.setPrice("BTC", 55, seeds);
  });

  it("Can open position", async function () {
    await amm.as(longer).increasePosition(10, DIR_LONG, 3, 0.15);

    const { size, margin, openNotional } = await amm.getPositionInfo(longer);

    expect(size).to.be.eq(543336);
    expect(margin).to.be.eq(9964129);
    expect(openNotional).to.be.eq(29892387);

    const { totalSize, totalLong, totalShort } = await amm.totalPositionInfo();

    expect(totalSize).to.be.eq(543336);
    expect(totalLong).to.be.eq(543336);
    expect(totalShort).to.be.eq(0);
  });
});
