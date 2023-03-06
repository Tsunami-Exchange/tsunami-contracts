const { loadSeed, loadAddress } = require("../common/wallet");

const migrate = async (e) => {
  let xVault = loadSeed("xVault");
  let xHousekeeper = loadSeed("xHousekeeper");
  let xStaking = loadSeed("xStaking");
  let xCoordinator = loadSeed("xCoordinator");
  let xOrders = loadSeed("xOrders");
  let xManager = loadSeed("xManager");
  let xAssetManager = loadSeed("xAssetManager");

  let quoteAsset = await e.getKey("k_quote_asset");
  let govAsset = await e.getKey("k_gov_asset");

  let xQuoteAsset = loadAddress("xQuoteAsset");

  let xQuoteGovMarket = loadAddress("xQuoteGovMarket");
  let xQuoteRewardMarket = loadAddress("xQuoteRewardMarket");

  let assets = {
    reward: quoteAsset,
    neutrino: xQuoteAsset,
    tsn: govAsset,
  };

  let seeds = {
    vault: xVault,
    housekeeper: xHousekeeper,
    staking: xStaking,
    coordinator: xCoordinator,
    orders: xOrders,
    manager: xManager,
    assetManager: xAssetManager,
  };

  let addresses = {
    quoteGovMarket: xQuoteGovMarket,
    quoteRewardMarket: xQuoteRewardMarket,
  };

  for (let seed of Object.values(seeds)) {
    console.log(`Add fee to ${address(seed)}`);

    await e.ensureDeploymentFee(address(seed), 4000000);
  }

  await e.upgradeCoordinator();

  await e.deployChild(seeds, assets, addresses);
};

module.exports = {
  migrate,
};
