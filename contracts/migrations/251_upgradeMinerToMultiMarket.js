const migrate = async (e) => {
  await e.miner.upgrade();
};

module.exports = {
  migrate,
};
