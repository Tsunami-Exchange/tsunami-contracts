let { Environment } = require("../common/common");

/**
 * @type {function(Environment)}
 */
const migrate = async (e) => {
  e.housekeeper.upgrade();
  if (!e.isChild) {
    e.swap.upgrade();
    e.spot.upgrade();
    e.sWavesAssetManager.upgrade();
  }
};

module.exports = {
  migrate,
};
