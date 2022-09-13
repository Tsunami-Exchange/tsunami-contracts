
const migrate = async(e) => {
    await e.staking.upgrade()
    await e.farming.upgrade()
}

module.exports = {
    migrate
}