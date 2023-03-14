const { loadSeed } = require("../common/wallet");

const migrate = async (e) => {
  e.seeds.swap = loadSeed("swapSeed");

  await e.deploySwap();
  console.log(`Swap deployed`);
};

module.exports = {
  migrate,
};
