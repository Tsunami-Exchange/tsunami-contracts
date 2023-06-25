let { Environment } = require("../common/common");

/**
 * @type {function(Environment)}
 */
const migrate = async (e) => {
  e.oracle.upgrade();
  for (let amm of e.amms) {
    await amm.upgrade();
  }
};

module.exports = {
  migrate,
};
