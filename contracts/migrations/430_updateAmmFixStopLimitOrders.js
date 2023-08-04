const { Environment } = require("../common/common");
/**
 * @type {function(Environment)}
 */
const migrate = async (e) => {
  await e.orders.upgrade();
};

module.exports = {
  migrate,
};
