const migrate = async (e) => {
  //  await e.upgradeCoordinator()
  //  await e.vault.upgrade()
  //  await e.manager.upgrade()
  //  await e.orders.upgrade()

  for (let amm of e.amms) {
    await amm.upgrade();
  }
};

module.exports = {
  migrate,
};
