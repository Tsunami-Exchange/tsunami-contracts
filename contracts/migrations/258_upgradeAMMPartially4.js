const migrate = async (e) => {
  await e.orders.upgrade();

  for (let amm of e.amms) {
    await amm.upgrade();
  }
};

module.exports = {
  migrate,
};
