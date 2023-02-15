const migrate = async (e) => {
  for (let amm of e.amms) {
    await e.forceSetKey(amm.address, "k_fundingMode", 2);
  }
};

module.exports = {
  migrate,
};
