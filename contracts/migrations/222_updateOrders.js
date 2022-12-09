const migrate = async (e) => {
  await e.orders.upgrade();
  await e.manager.upgrade();

  for (let amm of e.amms) {
    await amm.upgrade();
  }
};

module.exports = {
  migrate,
};
