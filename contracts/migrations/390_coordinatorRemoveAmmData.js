const { Environment } = require("../common/common");
/**
 * @type {function(Environment)}
 */
const migrate = async (e) => {
  await e.upgradeCoordinator();
};

module.exports = {
  migrate,
};
