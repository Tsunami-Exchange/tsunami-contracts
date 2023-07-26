const { Environment } = require("../common/common");
/**
 * @type {function(Environment)}
 */
const migrate = async (e) => {
  await e.manager.upgrade();
};

module.exports = {
  migrate,
};
