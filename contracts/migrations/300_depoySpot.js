const { Environment } = require("../common/common");
const { loadSeed, loadAddress } = require("../common/wallet");

/**
 * @type {function(Environment)}
 */
const migrate = async (e) => {
  const spot = loadSeed("spotSeed");

  await e.upgradeCoordinator();

  await e.vault.upgrade();
  await e.manager.upgrade();

  for (let amm of e.amms) {
    await amm.upgrade();
  }

  if (!e.isChild) {
    e.seeds.spot = spot;
    await e.deploySpot(0.003, 0.1);
  } else {
    await e.setSpot(address(spot));
  }
};

module.exports = {
  migrate,
};
