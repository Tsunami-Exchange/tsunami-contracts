const migrate = async (e) => {
  for (let amm of e.amms) {
    await amm.upgrade();
    //await e.forceSetKey(amm.address, "k_fee", 1400);
  }
  await e.orders.upgrade();
};

module.exports = {
  migrate,
};
