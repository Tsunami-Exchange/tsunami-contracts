const { loadSeed } = require("../common/wallet");

const migrate = async (e) => {
  e.seeds.housekeeper = loadSeed("housekeeper");
  await e.upgradeCoordinator();
  await e.deployHousekeeper();
};

module.exports = {
  migrate,
};
