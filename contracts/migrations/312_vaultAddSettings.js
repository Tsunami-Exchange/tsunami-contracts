let { Environment } = require("../common/common");
/**
 * @type {function(Environment)}
 */
const migrate = async (e) => {
  e.vault.upgrade();
  let vaults = await e.spot.getVaults();
  for (let v of vaults) {
    await v.upgrade();
  }
};

module.exports = {
  migrate,
};
