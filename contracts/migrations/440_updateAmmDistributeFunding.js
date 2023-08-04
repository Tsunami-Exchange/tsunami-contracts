const { Environment } = require("../common/common");
/**
 * @type {function(Environment)}
 */
const migrate = async (e) => {
  for (let amm of e.amms) {
    await amm.upgrade();
  }
};

module.exports = {
  migrate,
};
