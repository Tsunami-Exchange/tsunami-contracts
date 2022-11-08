const { loadSeed, loadAddress } = require("../common/wallet");

const x = [
  "3P1yXUDpcdzn5n8wM7wzKw4doq5bEG7mzZe",
  "3P2kPYQ86wzSk8ud82JMGovPcPS2EhXztQn",
  "3P3zL5oFkYqLhsRkikWoM89agnQ6DhuVxNV",
  "3PA51qCGL57rBWuD7CBTb3NeRQUxwUf6YRp",
  "3PEa9FHtMPHnuMy49sRkepXV12L1LVtckf8",
];

const migrate = async (e) => {
  e.seeds.manager = loadSeed("manager");
  //await e.upgradeCoordinator()
  //await e.deployManager(
  //    loadAddress("vires"),
  //    loadAddress("usdn"),
  //    loadAddress("viresUsdnVault")
  //)
  //await e.staking.upgrade()
  //await e.staking.migrateLiquidity()
  //await e.insurance.upgrade()
  //await e.insurance.migrateLiquidity()

  for (let amm of e.amms) {
    await amm.upgrade();
    if (!x.includes(amm.address)) {
      await amm.migrateLiquidity();
    }
  }
};

module.exports = {
  migrate,
};
