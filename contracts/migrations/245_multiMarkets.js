const { loadAddress, loadSeed } = require("../common/wallet");

const migrate = async (e) => {
  e.seeds.viresAssetManager = loadSeed("viresAssetManager");

  let quoteAssetId = loadAddress("usdn");

  if (!quoteAssetId) {
    throw `No quoteAssetId`;
  }
  await e.upgradeCoordinator();

  await e.deployViresAssetManager();
  console.log(`Vires asset manager deployed`);

  await e.manager.upgrade();
  console.log(`Manager updated`);

  await e.manager.pause();
  console.log(`Manager paused`);

  await e.manager.addAssetManager(
    quoteAssetId,
    address(e.seeds.viresAssetManager)
  );
  console.log(`Asset manager added`);

  await e.manager.migrate(quoteAssetId);
  console.log(`Manager migrated`);

  await e.manager.unpause();
  console.log(`Manager unpaused`);
};

module.exports = {
  migrate,
};
