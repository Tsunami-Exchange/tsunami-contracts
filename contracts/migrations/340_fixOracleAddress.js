let { Environment } = require("../common/common");
const { loadSeed } = require("../common/wallet");

/**
 * @type {function(Environment)}
 */
const migrate = async (e) => {
  const jitOracleSeed = loadSeed("jitOracleSeed");

  await e.upgradeCoordinator();
  await e.setOracleAddress(address(jitOracleSeed));
};

module.exports = {
  migrate,
};
