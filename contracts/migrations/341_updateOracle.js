let { Environment } = require("../common/common");

/**
 * @type {function(Environment)}
 */
const migrate = async (e) => {
  e.oracle.upgrade();
};

module.exports = {
  migrate,
};
