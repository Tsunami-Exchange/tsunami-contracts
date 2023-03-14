const { loadSeed, loadAddress } = require("../common/wallet");

const migrate = async (e) => {
  await e.orders.upgrade();

  for (let amm of e.amms) {
    await amm.upgrade();
    let traders = await amm.getTraders();
    for (let t of traders) {
      console.log(`Migrating position of ${t} in ${amm.address}`);

      await amm.migratePosition(t);
    }
    break;
  }
};

module.exports = {
  migrate,
};
