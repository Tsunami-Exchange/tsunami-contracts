const fetch = require('node-fetch')
const publicKeyByAddressCache = {}

const publicKeyByAddress = async(address) => {
    const json = await fetch(`${env.DS_API_BASE}/v0/transactions/all?sender=${address}&limit=1`).then(x => x.json())
    const result = json.data[0].data.senderPublicKey
    publicKeyByAddressCache[address] = result
    return result
}

module.exports = {
    publicKeyByAddress
}