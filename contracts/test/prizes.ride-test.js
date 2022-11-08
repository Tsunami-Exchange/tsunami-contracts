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

const collectAll = async (txId, what) => {
  const changes = await stateChanges(txId);
  const root = {
    stateChanges: changes,
  };

  const result = [];
  const collectIssues = (x) => {
    x.stateChanges[what].forEach((i) => result.push(i));
    x.stateChanges.invokes.forEach((i) => {
      collectIssues(i);
    });
  };

  collectIssues(root);
  return result;
};

const collectAllIssues = async (txId) => {
  return collectAll(txId, "issues");
};

const collectAllBurns = async (txId) => {
  return collectAll(txId, "burns");
};

const createTokenSignature = (
  _signer,
  _nonce,
  _recipient,
  _assetId,
  _amount
) => {
  let assetStr = `asset:${_assetId}`;
  const prizeStr = `${_nonce},${_recipient},${assetStr},${_amount}`;
  const r = [
    [_nonce, _recipient, assetStr, _amount],
    signBytes(_signer, new TextEncoder().encode(prizeStr)),
  ];
  return r;
};

const createMintTokenSignature = (
  _signer,
  _nonce,
  _recipient,
  _assetId,
  _amount
) => {
  let assetStr = `mint:${_assetId}`;
  const prizeStr = `${_nonce},${_recipient},${assetStr},${_amount}`;
  const r = [
    [_nonce, _recipient, assetStr, _amount],
    signBytes(_signer, new TextEncoder().encode(prizeStr)),
  ];
  return r;
};

const createMultiTokenSignature = (
  _signer,
  _nonce,
  _recipient,
  _assetIds,
  _amounts
) => {
  let assetStr = _assetIds.map((x) => `asset:${x}`).join(",");
  let amountsStr = _amounts.join(",");
  const prizeStr = `${_nonce},${_recipient},${assetStr},${amountsStr}`;
  const r = [
    [_nonce, _recipient, assetStr, amountsStr],
    signBytes(_signer, new TextEncoder().encode(prizeStr)),
  ];
  return r;
};

describe("Prize Manager should be able", async function () {
  this.timeout(600000);

  let e, user, user2, amm, artifactId;

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
    let [_amm] = await Promise.all([
      e.deployAmm(100000, 55),
      e.supplyTsn(100, address(e.seeds.prizes)),
      e.supplyUsdn(100, address(e.seeds.prizes)),
      e.supplyUsdn(100, address(user)),
    ]);

    amm = _amm;
  });

  let seed = 1;

  function uuidv4() {
    return "" + seed++;
  }

  it("to send token rewards to user with correct signature", async function () {
    let [data, signature] = createTokenSignature(
      e.seeds.admin,
      uuidv4(),
      address(user),
      e.assets.tsn,
      1 * wvs
    );
    await e.prizes.as(user).claimPrize(...data, signature);
    let balance = await assetBalance(e.assets.tsn, address(user));

    let tsnBalance = Math.round(balance / wvs);
    expect(tsnBalance).to.be.eq(1);
  });

  it("to reject double claim of same reward", async function () {
    let [data, signature] = createTokenSignature(
      e.seeds.admin,
      uuidv4(),
      address(user),
      e.assets.tsn,
      1 * wvs
    );
    await e.prizes.as(user).claimPrize(...data, signature);
    expect(e.prizes.as(user).claimPrize(...data, signature)).to.eventually.be
      .rejected;
  });

  it("to reject claim signed by wrong address", async function () {
    let [data, signature] = createTokenSignature(
      e.seeds.prizes,
      uuidv4(),
      address(user),
      e.assets.tsn,
      1 * wvs
    );
    expect(e.prizes.as(user).claimPrize(...data, signature)).to.eventually.be
      .rejected;
  });

  it("to reject claim from wrong user", async function () {
    let [data, signature] = createTokenSignature(
      e.seeds.admin,
      uuidv4(),
      address(user),
      e.assets.tsn,
      1 * wvs
    );
    expect(e.prizes.as(user2).claimPrize(...data, signature)).to.eventually.be
      .rejected;
  });

  it("to send token multiple rewards to user with correct signature", async function () {
    let [data, signature] = createMultiTokenSignature(
      e.seeds.admin,
      uuidv4(),
      address(user2),
      [e.assets.tsn, e.assets.neutrino],
      [1 * wvs, 2 * decimals]
    );
    await e.prizes.as(user2).claimPrize(...data, signature);

    let balance1 = await assetBalance(e.assets.tsn, address(user2));
    let balance2 = await assetBalance(e.assets.neutrino, address(user2));

    let tsnBalance = Math.round(balance1 / wvs);
    let usdnBalance = Math.round(balance2 / decimals);

    expect(tsnBalance).to.be.eq(1);
    expect(usdnBalance).to.be.eq(2);
  });

  it("create new nft type", async function () {
    await e.nfts.createNftType(
      "Reducer",
      "Fee reduction desc",
      "Image",
      "Tsunami",
      "fee_reduction",
      Math.round(0.5 * decimals)
    );
  });

  it("mint single existing nft type", async function () {
    let [data, signature] = createMintTokenSignature(
      e.seeds.admin,
      uuidv4(),
      address(user),
      "fee_reduction",
      1
    );
    let tx = await e.prizes.as(user).claimPrize(...data, signature);

    let allIssues = await collectAllIssues(tx.id);
    expect(allIssues.length).to.be.equal(1);

    let issue = allIssues[0];
    expect(issue.name).to.be.equal("Reducer # 1");

    let { type, value } = await e.nfts.getNftDetails(issue.assetId);

    expect(type).to.be.equal("fee_reduction");
    expect(value).to.be.equal(Math.round(0.5 * decimals));

    artifactId = issue.assetId;
  });

  it("mint multiple existing nft type", async function () {
    let [data, signature] = createMintTokenSignature(
      e.seeds.admin,
      uuidv4(),
      address(user),
      "fee_reduction",
      2
    );
    let tx = await e.prizes.as(user).claimPrize(...data, signature);

    let allIssues = await collectAllIssues(tx.id);
    expect(allIssues.length).to.be.equal(2);

    let issue1 = allIssues[0];
    expect(issue1.name).to.be.equal("Reducer # 2");
    let issue2 = allIssues[1];
    expect(issue2.name).to.be.equal("Reducer # 3");
  });

  it("allow attaching NFT to make new positions", async function () {
    let tx = await amm
      .as(user)
      .increasePosition(100, DIR_LONG, 1, 0, "", artifactId);
    let { margin } = await amm.getPositionInfo(user);

    expect(margin).to.equal(99500000);

    let burns = await collectAllBurns(tx.id);
    expect(burns.length).to.be.equal(1);
    expect(burns[0].assetId).to.be.equal(artifactId);
  });
});
