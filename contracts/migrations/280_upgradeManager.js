const { Environment } = require("../common/common");

/**
 * @type {function(Environment)}
 */
const migrate = async (e) => {
  e.manager.upgrade();
};

module.exports = {
  migrate,
};
