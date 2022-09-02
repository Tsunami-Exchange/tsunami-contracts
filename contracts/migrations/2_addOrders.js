const { loadSeed } = require('../common/wallet')

const migrate = async(e) => {
    e.seeds.orders = loadSeed('orders')
    await e.upgradeCoordinator()
    await e.deployOrders()

    for (let amm of e.amms) {
        await amm.upgrade()
    }
}

module.exports = {
    migrate
}