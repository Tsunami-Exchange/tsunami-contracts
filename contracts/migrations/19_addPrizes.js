const { loadSeed, loadAddress } = require('../common/wallet')

const migrate = async(e) => {
    e.seeds.prizes = loadSeed('prizes')
    e.seeds.nfts = loadSeed('nfts')

    const rewarderPublicKey = loadAddress('rewarderPublicKey')
    const marketplaceAddress = loadAddress('marketplaceAddress')

    await e.upgradeCoordinator()
    await e.deployPrizes(rewarderPublicKey)
    await e.deployNfts(marketplaceAddress)

    for (let amm of e.amms) {
        await amm.upgrade()
    }
}

module.exports = {
    migrate
}