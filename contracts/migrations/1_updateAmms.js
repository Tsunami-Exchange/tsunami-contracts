const { decimals } = require("../common/utils");

const migrate = async (e) => {
  for (let amm of e.amms) {
    await amm.upgrade();
    await amm.updateSettings({
      partialLiquidationRatio: 0.15 * decimals,
      maxPriceSpread: 0.4 * decimals,
    });
  }
};

module.exports = {
  migrate,
};
