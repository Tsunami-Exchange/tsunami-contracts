const migrate = async (e) => {
  await e.vault.upgrade();
  await e.forceSetKey(e.vault.address, "k_freeBalance", 1200000000000);
};

module.exports = {
  migrate,
};
