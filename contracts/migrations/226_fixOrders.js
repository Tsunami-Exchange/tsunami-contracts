const migrate = async (e) => {
  await e.miner.upgrade();
  await e.orders.upgrade();
};

module.exports = {
  migrate,
};
