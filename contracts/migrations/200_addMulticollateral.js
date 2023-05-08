const { loadSeed, loadAddress } = require("../common/wallet");

const migrate = async (e) => {
  e.seeds.collateral = loadSeed("collateral");

  const stablePuzzlePool = loadAddress("stablePuzzlePool");
  const usdt = loadAddress("usdt");
  const usdc = loadAddress("usdc");

  await e.upgradeCoordinator();
  //await e.insurance.upgrade();

  //await e.deployCollateral(stablePuzzlePool, [usdt, usdc]);

  for (let amm of e.amms) {
    await amm.upgrade();
  }
};

module.exports = {
  migrate,
};
