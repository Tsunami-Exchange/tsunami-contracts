const fs = require('fs')

const loadSeed = (alias) => {
    if (!env.WALLET) {
        throw new Error(`No WALLET set for env!`)
    }

    const wdir = (process.cwd() + env.WALLET).replace(".", "")

    if (!fs.existsSync(wdir)) {
        throw new Error(`Wallet ${wdir} not exists!`)
    }

    const w = JSON.parse(fs.readFileSync(wdir))

    if (!w[alias]) {
        throw new Error(`No seed for ${alias} in wallet`)
    }

    return w[alias]
}

const loadAddress = loadSeed

module.exports = {
    loadSeed,
    loadAddress
}