const migrate = async (e) => {
  await e.orders.upgrade();
};

module.exports = {
  migrate,
};
