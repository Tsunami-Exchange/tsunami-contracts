const migrate = async (e) => {
  //await e.collateral.upgrade();
  await e.manager.upgrade();
  await e.vault.upgrade();

  for (let amm of e.amms) {
    await amm.upgrade();

    //await e.forceSetKey(amm.address, "k_ora_block_key", "");

    //await e.forceSetKey(amm.address, "k_feeToStakersPercent", 300000);

    //await e.forceSetKey(amm.address, "k_maxOracleDelay", 1);
  }
};

module.exports = {
  migrate,
};
