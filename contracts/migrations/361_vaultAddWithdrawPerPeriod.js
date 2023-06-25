let { Environment } = require("../common/common");

/**
 * @type {function(Environment)}
 */
const migrate = async (e) => {
  await e.vault.upgrade();
  let spotVaults = await e.spot.getVaults();
  for (let spotVault of spotVaults) {
    await spotVault.upgrade();
  }
};

module.exports = {
  migrate,
};
