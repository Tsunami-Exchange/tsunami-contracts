const { Environment } = require("../common/common");
const { loadSeed, loadAddress } = require("../common/wallet");

/**
 * @type {function(Environment)}
 */
const migrate = async (e) => {
  const sWavesManager = loadSeed("sWavesManagerSeed");
  const sWavesAddress = loadSeed("sWavesAddress");

  await e.upgradeCoordinator();

  if (!e.isChild) {
    e.seeds.sWavesManager = sWavesManager;
    await e.deploySWavesManager(sWavesAddress);
  }
};

module.exports = {
  migrate,
};
