const migrate = async(e) => {
    await e.staking.upgrade()
}

module.exports = {
    migrate
}