const { loadSeed, loadAddress } = require('../common/wallet')

const migrate = async(e) => {
    e.seeds.manager = loadSeed('manager')
    await e.upgradeCoordinator()
    await e.deployManager(
        loadAddress("vires"),
        loadAddress("usdn"),
        loadAddress("viresUsdnVault")
    )
    await e.staking.upgrade()
    //await e.staking.migrateLiquidity()
    await e.insurance.upgrade() 
    await e.insurance.migrateLiquidity()

    for (let amm of e.amms) {
        await amm.upgrade()
        await amm.migrateLiquidity()   
    }
}

module.exports = {
    migrate
}