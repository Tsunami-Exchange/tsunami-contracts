let { Environment } = require("../common/common");

/**
 * @type {function(Environment)}
 */
const migrate = async (e) => {
  e.housekeeper.upgrade();
  if (!e.isChild) {
    e.spot.upgrade();
    let markets = await e.spot.getMarkets();
    for (let market of markets) [await market.upgrade()];
  }
};

module.exports = {
  migrate,
};
