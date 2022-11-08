const { loadAddress } = require("../common/wallet");

const migrate = async (e) => {
  await e.referral.upgrade();
  await e.referral.setSwapAddress(loadAddress("swap"));
};

module.exports = {
  migrate,
};
