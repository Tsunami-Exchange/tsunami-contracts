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

    describe("getPersonalPositionWithFundingPayment", async () => {
        it("return 0 margin when alice's position is underwater", async () => {
            // given alice takes 10x short position (size: -150) with 60 margin
            vamm.openPosition(ALICE, vamm.DIR_SHORT, toDecimal(60), toDecimal(10))
    
            // given the underlying twap price is $2.1, and current snapShot price is 400B/250Q = $1.6
            vamm.setTwapPrice(toFullDigit(2.1))
    
            // when the new fundingRate is -50% which means underlyingPrice < snapshotPrice
            gotoNextFundingTime()
    
            vamm.payFunding()
            expect(vamm.mock_getLatestCumulativePremiumFraction()).eq(toFullDigit(-0.5))
    
            // then alice need to pay 150 * 50% = $75
            // {size: -150, margin: 300} => {size: -150, margin: 0}
            const alicePosition = vamm.getPersonalPositionWithFundingPayment(ALICE)
            expect(alicePosition.size).to.eq(toFullDigit(-150))
            expect(alicePosition.margin).to.eq(toFullDigit(0))
        })
    })

    describe("openInterestNotional", () => {
        it("increase when increase position", async () => {
            vamm.openPosition(ALICE, vamm.DIR_LONG, toDecimal(600), toDecimal(1))

            expect(vamm.openInterestNotionalMap()).eq(toFullDigit(600))
        })

        it("reduce when reduce position", async () => {
            vamm.openPosition(ALICE, vamm.DIR_LONG, toDecimal(600), toDecimal(1), toDecimal(0))
            vamm.openPosition(ALICE, vamm.DIR_SHORT, toDecimal(300), toDecimal(1), toDecimal(0))

            expect(vamm.openInterestNotionalMap()).eq(toFullDigit(300))
        })

        it("reduce when close position", async () => {
            vamm.openPosition(ALICE, vamm.DIR_LONG, toDecimal(400), toDecimal(1))
            vamm.closePosition(ALICE)

            // expect the result will be almost 0 (with a few rounding error)
            expect(vamm.openInterestNotionalMap()).lte(10)
        })

        it("increase when traders open positions in different direction", async () => {
            vamm.openPosition(ALICE, vamm.DIR_LONG, toDecimal(300), toDecimal(1))
            vamm.openPosition(BOB, vamm.DIR_SHORT, toDecimal(300), toDecimal(1))

            expect(vamm.openInterestNotionalMap()).eq(toFullDigit(600))
        })

        it("is 0 when everyone close position", async () => {
            vamm.openPosition(ALICE, vamm.DIR_LONG, toDecimal(250), toDecimal(1))
            vamm.openPosition(BOB, vamm.DIR_SHORT, toDecimal(250), toDecimal(1))

            vamm.closePosition(ALICE)
            vamm.closePosition(BOB)

            // expect the result will be almost 0 (with a few rounding error)
            expect(vamm.openInterestNotionalMap()).lte(10)
        })

        it("is 0 when everyone close position, one of them is bankrupt position", async () => {
            vamm.openPosition(ALICE, vamm.DIR_SHORT, toDecimal(250), toDecimal(1))
            vamm.openPosition(BOB, vamm.DIR_LONG, toDecimal(250), toDecimal(1))

            // when alice close, it create bad debt (bob's position is bankrupt), so we can only liquidate her position
            // await clearingHouse.closePosition(amm.address, toDecimal(0), { from: alice })

            vamm.liquidate(BOB, ALICE)
            vamm.closePosition(BOB)


            // expect the result will be almost 0 (with a few rounding error)
            expect(vamm.openInterestNotionalMap()).lte(10)
        })
    })

    describe("payFunding: when alice.size = 37.5 & bob.size = -187.5", () => {
        beforeEach(async () => {
            // given alice takes 2x long position (37.5B) with 300 margin
            vamm.openPosition(ALICE, vamm.DIR_LONG, toDecimal(300), toDecimal(2))
  
            // given bob takes 1x short position (-187.5B) with 1200 margin
            vamm.openPosition(BOB, vamm.DIR_SHORT, toDecimal(1200), toDecimal(1))

            const clearingHouseBaseTokenBalance = vamm.getClearingHouseBalance()
            // 300 (alice's margin) + 1200 (bob' margin) = 1500
            expect(clearingHouseBaseTokenBalance).eq(toFullDigit(1500))
        })

        it("will generate loss for amm when funding rate is positive and amm hold more long position", async () => {
            // given the underlying twap price is 1.59, and current snapShot price is 400B/250Q = $1.6
            vamm.setTwapPrice(toFullDigit(1.59))
            
            // when the new fundingRate is 1% which means underlyingPrice < snapshotPrice
            gotoNextFundingTime()
            vamm.payFunding()

            expect(vamm.mock_getLatestCumulativePremiumFraction()).eq(toFullDigit(0.01))

            // then alice need to pay 1% of her position size as fundingPayment
            // {balance: 37.5, margin: 300} => {balance: 37.5, margin: 299.625}
            const alicePosition = vamm.getPersonalPositionWithFundingPayment(ALICE)
            expect(alicePosition.size).to.eq(toFullDigit(37.5))
            expect(alicePosition.margin).to.eq(toFullDigit(299.625))

            

            // then bob will get 1% of her position size as fundingPayment
            // {balance: -187.5, margin: 1200} => {balance: -187.5, margin: 1201.875}
            const bobPosition = vamm.getPersonalPositionWithFundingPayment(BOB)
            expect(bobPosition.size).to.eq(toFullDigit(-187.5))
            expect(bobPosition.margin).to.eq(toFullDigit(1201.875))

            // then fundingPayment will generate 1.5 loss and clearingHouse will withdraw in advanced from insuranceFund
            // clearingHouse: 1500 + 1.5
            // insuranceFund: 5000 - 1.5
            const clearingHouseQuoteTokenBalance = vamm.getClearingHouseBalance()
            expect(clearingHouseQuoteTokenBalance).to.eq(toFullDigit(1501.5))
            const insuranceFundBaseToken = vamm.getInsuranceFundBalance()
            expect(insuranceFundBaseToken).to.eq(toFullDigit(4998.5))
        })

        it("will keep generating the same loss for amm when funding rate is positive and amm hold more long position", async () => {
            // given the underlying twap price is 1.59, and current snapShot price is 400B/250Q = $1.6
            vamm.setTwapPrice(toFullDigit(1.59))

            // when the new fundingRate is 1% which means underlyingPrice < snapshotPrice, long pays short
            gotoNextFundingTime()
            vamm.payFunding()

            const clearingHouseQuoteTokenBalance1 = vamm.getClearingHouseBalance()
            expect(clearingHouseQuoteTokenBalance1).to.eq(toFullDigit(1501.5))
            const insuranceFundBaseToken1 = vamm.getInsuranceFundBalance()
            expect(insuranceFundBaseToken1).to.eq(toFullDigit(4998.5))

            gotoNextFundingTime()
            vamm.payFunding()

            // same as above test case:
            // there are only 2 traders: bob and alice
            // alice need to pay 1% of her position size as fundingPayment (37.5 * 1% = 0.375)
            // bob will get 1% of her position size as fundingPayment (187.5 * 1% = 1.875)
            // ammPnl = 0.375 - 1.875 = -1.5
            // clearingHouse payFunding twice in the same condition
            // then fundingPayment will generate 1.5 * 2 loss and clearingHouse will withdraw in advanced from insuranceFund
            // clearingHouse: 1500 + 3
            // insuranceFund: 5000 - 3

            const clearingHouseQuoteTokenBalance = vamm.getClearingHouseBalance()
            expect(clearingHouseQuoteTokenBalance).to.eq(toFullDigit(1503))
            const insuranceFundBaseToken = vamm.getInsuranceFundBalance()
            expect(insuranceFundBaseToken).to.eq(toFullDigit(4997))

        })

        it("funding rate is 1%, 1% then -1%", async () => {
            // given the underlying twap price is 1.59, and current snapShot price is 400B/250Q = $1.6
            vamm.setTwapPrice(toFullDigit(1.59))
            gotoNextFundingTime()
            vamm.payFunding()

            expect(vamm.mock_getLatestCumulativePremiumFraction()).eq(toFullDigit(0.01))

            // then alice need to pay 1% of her position size as fundingPayment
            // {balance: 37.5, margin: 300} => {balance: 37.5, margin: 299.625}
            expect(vamm.getPersonalPositionWithFundingPayment(ALICE).margin).to.eq(toFullDigit(299.625))
            expect(vamm.getPersonalBalanceWithFundingPayment(ALICE)).to.eq(toFullDigit(299.625))


            // pay 1% funding again
            // {balance: 37.5, margin: 299.625} => {balance: 37.5, margin: 299.25}
            gotoNextFundingTime()
            vamm.payFunding()

            expect(vamm.mock_getLatestCumulativePremiumFraction()).eq(toFullDigit(0.02))
            expect(vamm.getPersonalPositionWithFundingPayment(ALICE).margin).to.eq(toFullDigit(299.25))
            expect(vamm.getPersonalBalanceWithFundingPayment(ALICE)).to.eq(toFullDigit(299.25))

            
            // pay -1% funding
            // {balance: 37.5, margin: 299.25} => {balance: 37.5, margin: 299.625}
            vamm.setTwapPrice(toFullDigit(1.61))
            gotoNextFundingTime()
            vamm.payFunding()

            expect(vamm.mock_getLatestCumulativePremiumFraction()).eq(toFullDigit(0.01))
            expect(vamm.getPersonalPositionWithFundingPayment(ALICE).margin).to.eq(toFullDigit(299.625))
            expect(vamm.getPersonalBalanceWithFundingPayment(ALICE)).to.eq(toFullDigit(299.625))
        })

        it("funding rate is 1%, -1% then -1%", async () => {
            // given the underlying twap price is 1.59, and current snapShot price is 400B/250Q = $1.6
            vamm.setTwapPrice(toFullDigit(1.59))
            gotoNextFundingTime()
            vamm.payFunding()

            // then alice need to pay 1% of her position size as fundingPayment
            // {balance: 37.5, margin: 300} => {balance: 37.5, margin: 299.625}
            expect(vamm.mock_getLatestCumulativePremiumFraction()).eq(toFullDigit(0.01))
            expect(vamm.getPersonalPositionWithFundingPayment(ALICE).margin).to.eq(toFullDigit(299.625))
            expect(vamm.getPersonalBalanceWithFundingPayment(ALICE)).to.eq(toFullDigit(299.625))

            // pay -1% funding
            // {balance: 37.5, margin: 299.625} => {balance: 37.5, margin: 300}
            gotoNextFundingTime()
            vamm.setTwapPrice(toFullDigit(1.61))
            vamm.payFunding()

            expect(vamm.mock_getLatestCumulativePremiumFraction()).eq(toFullDigit(0))
            expect(vamm.getPersonalPositionWithFundingPayment(ALICE).margin).to.eq(toFullDigit(300))
            expect(vamm.getPersonalBalanceWithFundingPayment(ALICE)).to.eq(toFullDigit(300))
        

            // pay -1% funding
            // {balance: 37.5, margin: 300} => {balance: 37.5, margin: 300.375}
            gotoNextFundingTime()
            vamm.payFunding()

            expect(vamm.mock_getLatestCumulativePremiumFraction()).eq(toFullDigit(-0.01))
            expect(vamm.getPersonalPositionWithFundingPayment(ALICE).margin).to.eq(toFullDigit(300.375))
            expect(vamm.getPersonalBalanceWithFundingPayment(ALICE)).to.eq(toFullDigit(300.375))
        })

        it("has huge funding payment profit that doesn't need margin anymore", async () => {
            // given the underlying twap price is 21.6, and current snapShot price is 400B/250Q = $1.6
            vamm.setTwapPrice(toFullDigit(21.6))
            gotoNextFundingTime()
            vamm.payFunding()

            // then alice will get 2000% of her position size as fundingPayment
            // {balance: 37.5, margin: 300} => {balance: 37.5, margin: 1050}
            // then alice can withdraw more than her initial margin while remain the enough margin ratio
            vamm.removeMargin(ALICE, toDecimal(400))

            // margin = 1050 - 400 = 650
            expect(vamm.getPersonalPositionWithFundingPayment(ALICE).margin).to.eq(toFullDigit(650))
            expect(vamm.getPersonalBalanceWithFundingPayment(ALICE)).to.eq(toFullDigit(650))
        })

        it("has huge funding payment loss that the margin become 0 with bad debt of long position", async () => {
            // given the underlying twap price is 21.6, and current snapShot price is 400B/250Q = $1.6
            vamm.setTwapPrice(toFullDigit(21.6))
            gotoNextFundingTime()
            vamm.payFunding()

            expect(vamm.getPersonalPositionWithFundingPayment(BOB).margin).to.eq(toFullDigit(0))

            const [badDebt, fundingPayment] = vamm.mock_getPositionBadDebtAndFundingPayment(BOB)

            expect(badDebt).to.eq(toFullDigit(2550))
            expect(fundingPayment).to.eq(toFullDigit(3750))

            // liquidate the bad debt position
            expect(() => vamm.liquidate(BOB, ALICE)).to.throw();  
            vamm.liquidate(ALICE, BOB)
        })

        it("has huge funding payment loss that the margin become 0, can add margin", async () => {
            // given the underlying twap price is 21.6, and current snapShot price is 400B/250Q = $1.6
            vamm.setTwapPrice(toFullDigit(21.6))
            gotoNextFundingTime()
            vamm.payFunding()

            // then bob will get 2000% of her position size as fundingPayment
            // funding payment: -187.5 x 2000% = -3750, margin is 1200 so bad debt = -3750 + 1200 = 2550
            // margin can be added but will still shows 0 until it's larger than bad debt
            vamm.addMargin(BOB, toDecimal(1))
            expect(vamm.getPersonalPositionWithFundingPayment(BOB).margin).to.eq(toFullDigit(0))
        })

        it("reduce bad debt after adding margin to a underwater position", async () => {
            // given the underlying twap price is 21.6, and current snapShot price is 400B/250Q = $1.6
            vamm.setTwapPrice(toFullDigit(21.6))
            gotoNextFundingTime()
            vamm.payFunding()

            // then bob will get 2000% of her position size as fundingPayment
            // funding payment: -187.5 x 2000% = -3750, margin is 1200 so bad debt = -3750 + 1200 = 2550
            // margin can be added but will still shows 0 until it's larger than bad debt
            // margin can't removed
            vamm.addMargin(BOB, toDecimal(10))

            // close bad debt position
            // badDebt 2550 - 10 margin = 2540
            const [badDebt, fundingPayment] = vamm.mock_getPositionBadDebtAndFundingPayment(BOB)

            expect(badDebt).to.eq(toFullDigit(2540))
            expect(fundingPayment).to.eq(toFullDigit(3750))

            // liquidate the bad debt position
            expect(() => vamm.liquidate(BOB, ALICE)).to.throw();  
            vamm.liquidate(ALICE, BOB)
        })

        it("will change nothing if the funding rate is 0", async () => {
            // when the underlying twap price is $1.6, and current snapShot price is 400B/250Q = $1.6
            vamm.setTwapPrice(toFullDigit(1.6))

            // when the new fundingRate is 0% which means underlyingPrice = snapshotPrice
            gotoNextFundingTime()
            vamm.payFunding()
            expect(vamm.mock_getLatestCumulativePremiumFraction()).eq(toFullDigit(0))

            // then alice's position won't change
            // {balance: 37.5, margin: 300}
            const alicePosition = vamm.getPersonalPositionWithFundingPayment(ALICE)
            expect(alicePosition.size).to.eq(toFullDigit(37.5))
            expect(alicePosition.margin).to.eq(toFullDigit(300))

            // then bob's position won't change
            // {balance: -187.5, margin: 1200}
            const bobPosition = vamm.getPersonalPositionWithFundingPayment(BOB)
            expect(bobPosition.size).to.eq(toFullDigit(-187.5))
            expect(bobPosition.margin).to.eq(toFullDigit(1200))


            // clearingHouse: 1500
            // insuranceFund: 5000
            const clearingHouseQuoteTokenBalance = vamm.getClearingHouseBalance()
            expect(clearingHouseQuoteTokenBalance).to.eq(toFullDigit(1500))
            const insuranceFundBaseToken = vamm.getInsuranceFundBalance()
            expect(insuranceFundBaseToken).to.eq(toFullDigit(5000))
        })
    })

    describe("getMarginRatio", () => {
        it("get margin ratio", async () => {
            vamm.openPosition(ALICE, vamm.DIR_LONG, toDecimal(25), toDecimal(10))

            const marginRatio = await vamm.getMarginRatio(ALICE)
            expect(marginRatio).to.eq(toFullDigit(0.1))
        })

        it("get margin ratio - long", async () => {
            // (1000 + x) * (100 + y) = 1000 * 100
            //
            // Alice goes long with 25 quote and 10x leverage
            // open notional: 25 * 10 = 250
            // (1000 + 250) * (100 - y) = 1000 * 100
            // y = 20
            // AMM: 1250, 80
            vamm.openPosition(ALICE, vamm.DIR_LONG, toDecimal(25), toDecimal(10))

            // Bob goes short with 15 quote and 10x leverage
            // (1250 - 150) * (80 + y) = 1000 * 100
            // y = 10.9090909091
            // AMM: 1100, 90.9090909091
            vamm.openPosition(BOB, vamm.DIR_SHORT, toDecimal(15), toDecimal(10))

            // (1100 - x) * (90.9090909091 + 20) = 1000 * 100
            // position notional / x : 1100 - 901.6393442622 = 198.3606
            // unrealizedPnl: 198.3606 - 250 (open notional) = -51.6394
            // margin ratio:  (25 (margin) - 51.6394) / 198.3606 ~= -0.1342978394
            const marginRatio = vamm.getMarginRatio(ALICE)
            expect(marginRatio).to.eq(toFullDigit(-0.13429752))
        })

        it("get margin ratio - short", async () => {
            // Alice goes short with 25 quote and 10x leverage
            // open notional: 25 * 10 = 250
            // (1000 - 250) * (100 + y) = 1000 * 100
            // y = 33.3333333333
            // AMM: 750, 133.3333333333
            vamm.openPosition(ALICE, vamm.DIR_SHORT, toDecimal(25), toDecimal(10))

            // Bob goes long with 15 quote and 10x leverage
            // (750 + 150) * (133.3333333333 - y) = 1000 * 100
            // y = 22.222222222
            // AMM: 900, 111.1111111111
            vamm.openPosition(BOB, vamm.DIR_LONG, toDecimal(15), toDecimal(10))

            // (900 + x) * (111.1111111111 - 33.3333333333) = 1000 * 100
            // position notional / x : 1285.7142857139 - 900 = 385.7142857139
            // the formula of unrealizedPnl when short is the opposite of that when long
            // unrealizedPnl: 250 (open notional) - 385.7142857139 = -135.7142857139
            // margin ratio:  (25 (margin) - 135.7142857139) / 385.7142857139 ~= -0.287037037
            const marginRatio = vamm.getMarginRatio(ALICE)
            expect(marginRatio).to.eq(toFullDigit(-0.28703704))
        })

        it.skip("get margin ratio - higher twap", async () => {

            // Alice goes long with 25 quote and 10x leverage
            // open notional: 25 * 10 = 250
            // (1000 + 250) * (100 - y) = 1000 * 100
            // y = 20
            // AMM: 1250, 80
            vamm.openPosition(ALICE, vamm.DIR_LONG, toDecimal(25), toDecimal(10))

            // Bob goes short with 15 quote and 10x leverage
            // (1250 - 150) * (80 + y) = 1000 * 100
            // y = 10.9090909091
            // AMM: 1100, 90.9090909091
            vamm.openPosition(BOB, vamm.DIR_SHORT, toDecimal(15), toDecimal(10))

            // unrealized TWAP Pnl: -0.860655737704918033
            // margin ratio: (25 - 0.860655737704918033) / (250 - 0.860655737704918033) = 0.09689093601
            const marginRatio = vamm.getMarginRatio(ALICE)
            // TODO: Implement TWAP Pricing
            //
            //expect(marginRatio).to.eq(toFullDigit(-0.09689093601))
            
        })
    })

    describe("verify margin ratio when there is funding payment", () => {
        it("when funding rate is positive", async () => {
            vamm.openPosition(ALICE, vamm.DIR_LONG, toDecimal(25), toDecimal(10))

            // given the underlying twap price: 15.5
            vamm.setTwapPrice(toFullDigit(15.5))

            gotoNextFundingTime()
            vamm.payFunding()

            expect(vamm.mock_getLatestCumulativePremiumFraction()).eq(toFullDigit(0.125))

            // marginRatio = (margin + funding payment + unrealized Pnl) / positionNotional
            // funding payment: 20 * -12.5% = -2.5
            // position notional: 250
            // margin ratio: (25 - 2.5) / 250 = 0.09
            const aliceMarginRatio = vamm.getMarginRatio(ALICE)
            expect(aliceMarginRatio).to.eq(toFullDigit(0.09))
        })

        it("when funding rate is negative", async () => {
            // price: 1250 / 80 = 15.625
            vamm.openPosition(ALICE, vamm.DIR_LONG, toDecimal(25), toDecimal(10))

            // given the underlying twap price is 15.7
            vamm.setTwapPrice(toFullDigit(15.7))

            gotoNextFundingTime()
            vamm.payFunding()

            expect(vamm.mock_getLatestCumulativePremiumFraction()).eq(toFullDigit(-0.075))

            // marginRatio = (margin + funding payment + unrealized Pnl) / openNotional
            // funding payment: 20 * 7.5% = 1.5
            // position notional: 250
            // margin ratio: (25 + 1.5) / 250 =  0.106
            const aliceMarginRatio = vamm.getMarginRatio(ALICE)
            expect(aliceMarginRatio).to.eq(toFullDigit(0.106))
        })

        it("with pnl and funding rate is positive", async () => {
            // price: 1250 / 80 = 15.625
            vamm.openPosition(ALICE, vamm.DIR_LONG, toDecimal(25), toDecimal(10))
            
            // price: 800 / 125 = 6.4
            vamm.openPosition(BOB, vamm.DIR_SHORT, toDecimal(45), toDecimal(10))


            // given the underlying twap price: 6.3
            vamm.setTwapPrice(toFullDigit(6.3))

            gotoNextFundingTime()
            vamm.payFunding()

            expect(vamm.mock_getLatestCumulativePremiumFraction()).eq(toFullDigit(0.1))

            // marginRatio = (margin + funding payment + unrealized Pnl) / positionNotional
            // funding payment: 20 (position size) * -10% = -2
            // (800 - x) * (125 + 20) = 1000 * 100
            // position notional / x : 800 - 689.6551724138 = 110.3448275862
            // unrealized Pnl: 250 - 110.3448275862 = 139.6551724138
            // margin ratio: (25 - 2 - 139.6551724138) / 110.3448275862 = -1.0571875
            const aliceMarginRatio = vamm.getMarginRatio(ALICE)
            expect(aliceMarginRatio).to.eq(toFullDigit(-1.0571875))

            // funding payment (bob receives): 45 * 10% = 4.5
            // margin ratio: (45 + 4.5) / 450 = 0.11
            const bobMarginRatio = vamm.getMarginRatio(BOB)
            expect(bobMarginRatio).to.eq(toFullDigit(0.11))
        })

        it("with pnl and funding rate is negative", async () => {
            // price: 1250 / 80 = 15.625
            vamm.openPosition(ALICE, vamm.DIR_LONG, toDecimal(25), toDecimal(10))

            // price: 800 / 125 = 6.4
            vamm.openPosition(BOB, vamm.DIR_SHORT, toDecimal(45), toDecimal(10))

            // given the underlying twap price: 6.5
            vamm.setTwapPrice(toFullDigit(6.5))

            gotoNextFundingTime()
            vamm.payFunding()

            expect(vamm.mock_getLatestCumulativePremiumFraction()).eq(toFullDigit(-0.1))

            // funding payment (alice receives): 20 (position size) * 10% = 2
            // (800 - x) * (125 + 20) = 1000 * 100
            // position notional / x : 800 - 689.6551724138 = 110.3448275862
            // unrealized Pnl: 250 - 110.3448275862 = 139.6551724138
            // margin ratio: (25 + 2 - 139.6551724138) / 110.3448275862 = -1.0209375
            const aliceMarginRatio = vamm.getMarginRatio(ALICE)
            expect(aliceMarginRatio).to.eq(toFullDigit(-1.0209375))

            // funding payment: 45 (position size) * -10% = -4.5
            // margin ratio: (45 - 4.5) / 450 = 0.09
            const bobMarginRatio = vamm.getMarginRatio(BOB)
            expect(bobMarginRatio).to.eq(toFullDigit(0.09))
        })
    })

    describe("liquidate", () => {
        it("a long position is under water, thus liquidating the complete position", async () => {
            // when alice create a 25 margin * 10x position to get 20 long position
            // AMM after: 1250 : 80
            vamm.openPosition(ALICE, vamm.DIR_LONG, toDecimal(25), toDecimal(10))

            // when bob create a 73.52941176 margin * 1x position to get 3 short position
            // AMM after: 1176.470588 : 85
            vamm.openPosition(BOB, vamm.DIR_SHORT, toDecimal(73.52941176), toDecimal(1))
            
            const [badDebt] = vamm.mock_getPositionBadDebtAndFundingPayment(ALICE)

            expect(badDebt).to.eq(toFullDigit(0.91036414))

            vamm.liquidate(CAROLL, ALICE)

            expect(vamm.getPosition(ALICE).size).to.eq(0)
            expect(vamm.balanceOf(CAROLL)).to.eq(toFullDigit(2.80112045))
            // 5000 - 0.91 - 2.8
            expect(vamm.getInsuranceFundBalance()).to.eq(toFullDigit(4996.28851541))
        })

        it("a short position is under water, thus liquidating the complete position", async () => {
            // when alice create a 20 margin * 10x position to get 25 short position
            // AMM after: 800 : 125
            vamm.openPosition(ALICE, vamm.DIR_SHORT, toDecimal(20), toDecimal(10))

            // when bob create a 40.33613445 margin * 1x position to get 3 long position
            // AMM after: 840.3361345 : 119
            vamm.openPosition(BOB, vamm.DIR_LONG, toDecimal(40.33613445), toDecimal(1))

            syncAmmPriceToOracle()

            const [badDebt] = vamm.mock_getPositionBadDebtAndFundingPayment(ALICE)

            expect(badDebt).to.eq(349365278)

            vamm.liquidate(CAROLL, ALICE)

            expect(vamm.getPosition(ALICE).size).to.eq(0)
            expect(vamm.balanceOf(CAROLL)).to.eq(279367066)

            // 5000 - 3.49 - 2.79
            expect(vamm.getInsuranceFundBalance()).to.eq(499371267656)
        })

        it("force error, can't liquidate an empty position", async () => {
            expect(
                () => vamm.liquidate(BOB, ALICE)
            ).to.throw(); 
        })
    })

    describe("clearingHouse", () => {
        beforeEach(async () => {
            //expect(vamm.getClearingHouseBalance()).eq(toFullDigit(100))
        })

        it("clearingHouse should have enough balance after close position", async () => {
            // AMM after: 900 : 111.1111111111
            vamm.openPosition(BOB, vamm.DIR_SHORT, toDecimal(20), toDecimal(5))
            
            // AMM after: 800 : 125
            vamm.openPosition(ALICE, vamm.DIR_SHORT, toDecimal(25), toDecimal(4))

            // 20(bob's margin) + 25(alice's margin) = 45
            expect(vamm.getClearingHouseBalance()).to.eq(toFullDigit(45))
            
            // when bob close his position (11.11)
            // AMM after: 878.0487804877 : 113.8888888889
            // Bob's PnL = 21.951219512195121950
            // need to return Bob's margin 20 and PnL 21.951 = 41.951
            // clearingHouse balance: 45 - 41.951 = 3.048...
            vamm.closePosition(BOB)

            expect(vamm.getInsuranceFundBalance()).to.eq(toFullDigit(5000))
            expect(vamm.getClearingHouseBalance()).to.eq(toFullDigit(3.04878048))
        })

        it("clearingHouse doesn't have enough balance after close position and ask for InsuranceFund", async () => {
            // AMM after: 900 : 111.1111111111
            vamm.openPosition(BOB, vamm.DIR_SHORT, toDecimal(20), toDecimal(5))

            // AMM after: 800 : 125
            vamm.openPosition(ALICE, vamm.DIR_SHORT, toDecimal(20), toDecimal(5))

            // 20(bob's margin) + 20(alice's margin) = 40
            expect(vamm.getClearingHouseBalance()).to.eq(toFullDigit(40))

            // when bob close his position (11.11)
            // AMM after: 878.0487804877 : 113.8888888889
            // Bob's PnL = 21.951219512195121950
            // need to return Bob's margin 20 and PnL 21.951 = 41.951
            // clearingHouse balance: 40 - 41.951 = -1.95...
            vamm.closePosition(BOB)

            expect(vamm.getInsuranceFundBalance()).to.eq(toFullDigit(4998.04878048))
            expect(vamm.getClearingHouseBalance()).to.eq(toFullDigit(0))
        })
    })

    describe("slippage limit", () => {
        it("closePosition, originally long, (amount should pay = 118.03279) at the limit of min quote amount = 118", async () => {
            // when bob create a 20 margin * 5x short position when 9.0909091 quoteAsset = 100 DAI
            // AMM after: 1100 : 90.9090909
            vamm.openPosition(BOB, vamm.DIR_LONG, toDecimal(20), toDecimal(5), toDecimal(9))

            expect(
                () => vamm.openPosition(ALICE, vamm.DIR_LONG, toDecimal(20), toDecimal(5), toDecimal(9))
            ).to.throw(); 

            // when alice create a 20 margin * 5x short position when 7.5757609 quoteAsset = 100 DAI
            // AMM after: 1200 : 83.3333333
            vamm.openPosition(ALICE, vamm.DIR_LONG, toDecimal(20), toDecimal(5), toDecimal(7.5))

            // when bob close his position
            // AMM after: 1081.96721 : 92.4242424
            vamm.closePosition(BOB, toDecimal(118))

            const quoteAssetReserve = vamm.getQuoteAssetReserve()
            const baseAssetReserve = vamm.getBaseAssetReserve()

            expect(parseFloat(quoteAssetReserve.toString().substring(0, 6)) / 100).to.eq(1081.96)
            expect(parseFloat(baseAssetReserve.toString().substring(0, 6)) / 10000).to.eq(92.4242)
        })
    })
})