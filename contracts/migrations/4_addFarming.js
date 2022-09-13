const { loadSeed } = require('../common/wallet')

const migrate = async(e) => {
    e.seeds.farming = loadSeed('farming')
    await e.upgradeCoordinator()
    await e.deployFarming()
}

module.exports = {
    migrate
}