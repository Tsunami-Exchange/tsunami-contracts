let { Environment } = require("../common/common");

/**
 * @type {function(Environment)}
 */
const migrate = async (e) => {
  await e.prizes.upgrade();
};

module.exports = {
  migrate,
};
