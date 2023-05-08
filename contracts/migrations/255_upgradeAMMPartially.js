const migrate = async (e) => {
  await e.orders.upgrade();

  for (let amm of e.amms) {
    await amm.upgrade();
    let traders = await amm.getTraders();
    for (let t of traders) {
      console.log(`Migrating position of ${t} in ${amm.address}`);

      if (!t.includes("_1") && !t.includes("_2")) {
        await amm.migratePosition(t);
      }
    }
  }
};

module.exports = {
  migrate,
};
