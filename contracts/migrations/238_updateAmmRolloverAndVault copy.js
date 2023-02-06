const migrate = async (e) => {
  await e.vault.upgrade();
  for (let amm of e.amms) {
    await amm.upgrade();
  }
};

module.exports = {
  migrate,
};
