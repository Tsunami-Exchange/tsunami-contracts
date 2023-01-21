const migrate = async (e) => {
  await e.vault.upgrade();
};

module.exports = {
  migrate,
};
