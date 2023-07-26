const { Environment } = require("../common/common");
/**
 * @type {function(Environment)}
 */
const migrate = async (e) => {
  await e.housekeeper.upgrade();
};

module.exports = {
  migrate,
};
