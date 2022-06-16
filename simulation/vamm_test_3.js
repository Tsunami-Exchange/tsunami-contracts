const { expect } = require('chai')

const vamm = require('./vamm')

const ALICE = "Alice"
const BOB = "Bob"
const CAROLL = "Caroll"

const DEFAULT_TOKEN_DECIMALS = 8

const toFullDigit = (val, decimals = DEFAULT_TOKEN_DECIMALS) => {
    const tokenDigit = 10 ** decimals
    const bigNumber = val * tokenDigit
    return Math.round(bigNumber)
}

const toDecimal = (x) => toFullDigit(x)

const gotoNextFundingTime = () => {
    vamm.mock_advanceToFundingBlock()
}

const syncAmmPriceToOracle = () => {
    vamm.setTwapPrice(vamm.getTwapSpotPrice())
}

describe("AMM Simulation Test", async() => {

    beforeEach("setup amm", async() => {
        vamm.reset()
        vamm.init(toFullDigit(1000), toFullDigit(100), toFullDigit(86400))
    })

    describe("should luquidate alice position", async () => {
        it("onn x1", async () => {
            // given alice takes 1x short position (size: ~ -2) with 20 margin
            console.log(`getTwapSpotPrice=${vamm.getTwapSpotPrice()}`)
            vamm.openPosition(ALICE, vamm.DIR_SHORT, toDecimal(20), toDecimal(1))
            console.log(`getTwapSpotPrice=${vamm.getTwapSpotPrice()}`)
            vamm.openPosition(BOB, vamm.LONG_SHORT, toDecimal(50), toDecimal(10))
            console.log(`getTwapSpotPrice=${vamm.getTwapSpotPrice()}`)
    
        })
    })
})