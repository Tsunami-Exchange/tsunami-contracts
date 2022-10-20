const migrate = async(e) => {
    await e.farming.upgrade()
    await e.staking.upgrade()
    await e.miner.upgrade()
}

module.exports = {
    migrate
}