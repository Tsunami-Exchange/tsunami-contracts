const migrate = async (e) => {
  let quoteAsset = await e.getKey("k_quote_asset");
  await e.forceSetKey(e.addresses.coordinator, "k_reward_asset", quoteAsset);

  await e.staking.upgrade();
  await e.farming.upgrade();
  await e.referral.upgrade();
  await e.housekeeper.upgrade();
};

module.exports = {
  migrate,
};
