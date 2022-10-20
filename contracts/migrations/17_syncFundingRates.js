function roundToHour(date) {
    p = 60 * 60 * 1000; // milliseconds in an hour
    return new Date(Math.round(date.getTime() / p ) * p);
  }

const migrate = async(e) => {
    let refAmm = e.amms[0]
    let refNextFundingBlockTs = await refAmm.getNextFundingTimestamp()
    let syncNextFundingBlockTs = roundToHour(new Date(refNextFundingBlockTs)).getTime()
    for (let amm of e.amms) {
        await e.forceSetKey(amm.address, "k_nextFundingBlockMinTimestamp", syncNextFundingBlockTs)
    }
}

module.exports = {
    migrate
}