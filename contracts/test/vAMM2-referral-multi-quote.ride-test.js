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

// 17935
const computeFee = (payment, leverage, fee) => {
  let amount = payment / (fee * leverage + 1);
  return payment - amount;
};

describe("vAMM should work with referral program (with other quote asset)", async function () {
  this.timeout(600000);

  let e, amm, longer, shorter, liquidator, referrer;

  before(async function () {
    await setupAccounts({
      admin: 1 * wvs,
      longer: 0.1 * wvs,
      shorter: 0.1 * wvs,
      liquidator: 0.1 * wvs,
      referrer: 0.1 * wvs,
    });

    longer = accounts.longer;
    shorter = accounts.shorter;
    liquidator = accounts.liquidator;
    referrer = accounts.referrer;

    let x = new Environment(accounts.admin);
    await x.deploy();
    e = await x.deployDefaultChild(x.assets.usdt);
    await e.fundAccounts({
      [longer]: 100,
      [shorter]: 100,
    });

    amm = await e.deployAmm(100000, 55);
  });

  it("Can add generate referral links", async function () {
    await e.referral.as(referrer).createReferralLink();
  });

  it("Will auto register a referral on first position increase", async function () {
    let links = await e.referral.getLinksFor(address(referrer));
    let link = links[0];

    await amm.as(longer).increasePosition(5, DIR_LONG, 3, 0.15, link);

    let longerReferrer = await e.referral.getReferrer(address(longer));
    let referrerEarned = await e.referral.getEarned(address(referrer));

    let fee = computeFee(5, 3, 0.0012);
    let refFee = fee * 0.2;

    console.log(`Expected fee=${fee} refFee=${refFee}`);

    expect(longerReferrer).to.be.eq(address(referrer));
    expect(referrerEarned).to.be.closeTo(refFee, 0.00001); // 20% of 1% fee of $5

    console.log(`First check OK`);

    await amm.as(longer).closePosition();
    referrerEarned = await e.referral.getEarned(address(referrer));

    expect(referrerEarned).to.be.closeTo(2 * refFee, 0.00001); // 20% of 1% fee of $5
  });

  it("Will not register a referral after first transaction on a platform without ref link", async function () {
    let links = await e.referral.getLinksFor(address(referrer));
    let link = links[0];

    await amm.as(shorter).increasePosition(5, DIR_SHORT, 3, 0.15); // First tx without ref link
    await amm.as(shorter).increasePosition(5, DIR_SHORT, 3, 0.15, link);
    await amm.as(shorter).addMargin(3);

    let shorterReferrer = await e.referral.getReferrer(address(shorter));
    let referrerEarned = await e.referral.getEarned(address(referrer));

    let fee = computeFee(5, 3, 0.0012);
    let refFee = fee * 0.2;

    expect(shorterReferrer).to.be.eq(null);
    expect(referrerEarned).to.be.closeTo(2 * refFee, 0.00001); // No new fees
  });

  it("Can claim rewards", async function () {
    await e.referral.as(referrer).claimRewards();

    let referrerEarned = await e.referral.getEarned(address(referrer));
    let referrerClaimed = await e.referral.getClaimed(address(referrer));

    let fee = computeFee(5, 3, 0.0012);
    let refFee = fee * 0.2;

    expect(referrerEarned - referrerClaimed).to.be.closeTo(0, 0.00001);
    expect(referrerClaimed).to.be.closeTo(2 * refFee, 0.00001);
  });
});
