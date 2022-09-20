const { loadSeed } = require('../common/wallet')

const migrate = async(e) => {
    e.seeds.referral = loadSeed('referral')
    await e.upgradeCoordinator()
    await e.deployReferral(0.2)

    for (let amm of e.amms) {
        await amm.upgrade()
    }
}

module.exports = {
    migrate
}