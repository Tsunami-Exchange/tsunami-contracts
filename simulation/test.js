let message = "Error while executing account-script: 1=-654244 2=0 3=-10819 4=-15989181 5=99985010819 6=1818272545 7=272545 8=-272545 9=-14989181 10=15000000"
message = message.replace('Error while executing account-script: ', '')
const parts = message.split(' ')
let vs = []
for (let part of parts) {
    const [_, v] = part.split('=')
    vs.push(v)

}

const exchangedPositionSize = vs[0]
const badDebt = vs[1]
const realizedPnl = vs[2]
const marginToVault = vs[3]
const quoteAssetReserveAfter = vs[4]
const baseAssetReserveAfter = vs[5]
const baseAssetDeltaThisFundingPeriodAfter = vs[6]
const totalPositionSizeAfter = vs[7]
const cumulativeNotionalAfter = vs[8]
const openInteresetNotionalAfter = vs[9]

const data = {
    exchangedPositionSize,
    badDebt,
    realizedPnl,
    marginToVault,
    quoteAssetReserveAfter,
    baseAssetReserveAfter,
    baseAssetDeltaThisFundingPeriodAfter,
    totalPositionSizeAfter,
    cumulativeNotionalAfter,
    openInteresetNotionalAfter
}

console.log(JSON.stringify(data, null, 2))