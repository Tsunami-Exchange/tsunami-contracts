const { publicKeyByAddress } = require('./dataservice')

const deploy = async (filename, fee, seed, name, injectTimer, timerAddress) => {
    let code = file(filename)
    if (injectTimer) {
        code = code.replace('lastBlock.timestamp', `addressFromStringValue("${timerAddress}").getInteger("timestamp").valueOrElse(${new Date().getTime()})`)
        console.log(`Injected timer to ${name}`)
    }
    const script = compile(code)
    const tx = setScript({ script, fee}, seed);
    await broadcast(tx);
    console.log(`${name} deployed to ${address(seed)} in ${tx.id}`)
    return waitForTx(tx.id)
}

const upgrade = async(filename, address, fee, adminSeed) => {
    const code = file(filename)
    const script = compile(code)
    if (!address) {
        throw(`Address not defined`)
    }
    const senderPublicKey = await publicKeyByAddress(address)
    console.log(`senderPublicKey=${senderPublicKey} for address=${address}`)
    if (!senderPublicKey) {
        throw(`No sender public key`)
    }
    if (senderPublicKey === publicKey(adminSeed)) {
        throw(`Can not install script on admin account`)
    }
    const issTx = setScript({
        senderPublicKey, 
        script, 
        fee,
    }, adminSeed)

    await broadcast(issTx)
    await waitForTx(issTx.id)

    return issTx
}

const clearScript = async(seed) => {
    const script = null
    const issTx = setScript({
        senderPublicKey: publicKey(seed), 
        script, 
    }, seed)

    await broadcast(issTx)
    await waitForTx(issTx.id)

    return issTx
}

module.exports = {
    deploy,
    upgrade,
    clearScript
}