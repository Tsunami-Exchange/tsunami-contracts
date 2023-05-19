const { Environment } = require("../common/common");
const { loadSeed, loadAddress } = require("../common/wallet");

/**
 * @type {function(Environment)}
 */
const migrate = async (e) => {
  const jitOracleSeed = loadSeed("jitOracleSeed");
  const jitPublicKeys = loadAddress("jitPublicKeys");

  await e.upgradeCoordinator();
  await e.orders.upgrade();
  await e.housekeeper.upgrade();

  for (let amm of e.amms) {
    await amm.upgrade();
  }

  if (!e.isChild) {
    e.seeds.jitOracle = jitOracleSeed;
    await e.deployJitOracle(jitPublicKeys);
  }
};

module.exports = {
  migrate,
};
