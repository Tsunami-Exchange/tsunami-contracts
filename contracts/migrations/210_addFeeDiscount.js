const { wvs, decimals } = require("../common/utils");

const migrate = async (e) => {
  await e.miner.upgrade();
  /*await e.miner.setFeeDiscountTiers([
    [100000 * wvs, Math.round(0.9 * decimals)],
    [500000 * wvs, Math.round(0.8 * decimals)],
    [1000000 * wvs, Math.round(0.45 * decimals)],
    [5000000 * wvs, Math.round(0.25 * decimals)],
    [9000000 * wvs, Math.round(0.15 * decimals)],
  ]);*/
};

module.exports = {
  migrate,
};
