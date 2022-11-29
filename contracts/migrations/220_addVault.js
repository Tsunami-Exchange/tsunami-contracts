const { loadSeed } = require("../common/wallet");

const migrate = async (e) => {
  e.seeds.vault = loadSeed("vault");

  await e.upgradeCoordinator();
  await e.insurance.upgrade();
  await e.manager.upgrade();
  await e.deployVault();
};

module.exports = {
  migrate,
};
