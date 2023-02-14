# vAMM3.ride

## Functions

### pause

`pause` - Pauses the contract. During the pause, no actions can be taken except for unpausing the contract.The purpose of pausing the contract may be to perform maintenance work or to immediately stop the market.

**note:** admin only

### unpause

`unpause` - Unpauses contract.

**note:** admin only

### setCloseOnly

`setCloseOnly` - Sets the market to close-only mode. During close-only mode, positions can only be reduced(closed or liquidated). The purpose of setting the market to close-only modeis to gradually close a market for a given pair.

**note:** admin only

### unsetCloseOnly

`unsetCloseOnly` - Unset close-only mode on a contract.

**note:** admin only

### addLiquidity

`addLiquidity` - Adds specified amount of liquidity to the market.

**note:** admin only

#### Parameters

`_quoteAssetAmount`: `Int`- Amount of liquidity to add (in quote asset, 6 decimals)

### removeLiquidity

`removeLiquidity` - Removes specified amount of liquidity to the market.

**note:** admin only

#### Parameters

`_quoteAssetAmount`: `Int`- Amount of liquidity to remove (in quote asset, 6 decimals)

### changeSettings

`changeSettings` - Changes the settings of the contract.

**note:** admin only

#### Parameters

`_initMarginRatio`: `Int`- The initial margin ratio for the contract.
`_mmr`: `Int`- The maintenance margin ratio for the contract.
`_liquidationFeeRatio`: `Int`- The liquidation fee ratio for the contract.
`_fundingPeriod`: `Int`- The funding period for the contract.
`_fee`: `Int`- The fee for the contract.
`_spreadLimit`: `Int`- The spread limit for the contract.
`_maxPriceImpact`: `Int`- The maximum price impact for the contract.
`_partialLiquidationRatio`: `Int`- The partial liquidation ratio for the contract.
`_maxPriceSpread`: `Int`- The maximum oracle / market price spread for the contract.
`_maxOpenNotional`: `Int`- The maximum open notional in one direction for the contract.
`_feeToStakersPercent`: `Int`- The fee to stakers percent for the contract.
`_maxOracleDelay`: `Int`- The maximum oracle delay (blocks) for the contract.
`_rolloverFee`: `Int`- The rollover fee for the contract.

### initialize

`initialize` -

#### Parameters

`_qtAstR`: `Int`
`_bsAstR`: `Int`
`_fundingPeriod`: `Int`
`_initMarginRatio`: `Int`
`_mmr`: `Int`
`_liquidationFeeRatio`: `Int`
`_fee`: `Int`
`_baseOracleData`: `String`
`_quoteOracleData`: `String`
`_coordinator`: `String`
`_spreadLimit`: `Int`
`_maxPriceImpact`: `Int`
`_partialLiquidationRatio`: `Int`
`_maxPriceSpread`: `Int`
`_maxOpenNotional`: `Int`
`_feeToStakersPercent`: `Int`
`_maxOracleDelay`: `Int`
`_rolloverFee`: `Int`

### increasePosition

`increasePosition` - Allows traders to open or increase their position by placing a trade in a specific direction(long or short) with a specified leverage.

**note:** if position already opened fully realizes funding and rollover fee

#### Parameters

`_direction`: `Int`- The direction in which the position should be increased. (1 for LONG, 2 for SHORT)
`_leverage`: `Int`- The leverage to be used for the position increase. (in 6 decimals)
`_minBaseAssetAmount`: `Int`- The minimum expected base asset amount to get. (in 6 decimals)
`_refLink`: `String`- The referral link if any (or empty string)

#### Payments

`Payment 1`: required Initial margin (in quote asset)
`Payment 2`: optional NFT artifact for fee reduction

### addMargin

`addMargin` - Adds margin to a position

**note:** fully realizes rollover fee, funding stays unrealized

#### Payments

`Payment 1`: required Added margin (in quote asset)

### removeMargin

`removeMargin` - Remove margin from a position

**note:** @notice
**note:** fully realizes funding and rollover fee
**note:** will throw "Too much margin removed" if after removal position margin ratio is below initial margin ratio

#### Parameters

`_amount`: `Int`- removed margin (in quote asset)

### closePosition

`closePosition` - Function to close a position with a specified size, minimum quote asset amount, and add to margin option.

**note:** will not close position with bad debt (they can ony be liquidated)

#### Parameters

`_size`: `Int`- The size of the position to close. If less then current position size position will be closed partially.
`_minQuoteAssetAmount`: `Int`- The minimum expected amount of the quote asset.
`_addToMargin`: `Boolean`- if true, do not withdraw funds from position, instead add them to margin (reduce position size, keep margin).

### liquidate

`liquidate` - Function to liquidate a trader's position.

#### Parameters

`_trader`: `String`- The address of the trader to be liquidated.

### payFunding

`payFunding` - Function to pay (exchange) funding. This method can be called by anyone, but usually is called by an exchange's keeper bot.

### syncTerminalPriceToOracle

`syncTerminalPriceToOracle` - Function to sync exchange terminal price to index price (Oracle price).This method can be called by anyone, but usually is called by an exchange's keeper bot.Additionally it's called automatically prior to any interaction with exchange to ensurethat every call relies to actual AMM state

### ensureCalledOnce

`ensureCalledOnce` - Function to ensure that this contract can only be called once in transaction, preventing front-running

**note:** may only be called by contract itself

### view_calcRemainMarginWithFundingPayment

`view_calcRemainMarginWithFundingPayment` - View function. Return full information about position in it's throws message.1 - remaining effective margin (with funding, rollover and PnL) in 6 decimals2 - funding payment in 6 decimals3 - margin ratio in 6 decimals4 - unrealized PnL in 6 decimals5 - bad debt in 6 decimals

#### Parameters

`_trader`: `String`- Address of trader

### view_getPegAdjustCost

`view_getPegAdjustCost` - View function. Return info about the cost to LP's (positive or negative) to sync to current price in it's throws message.1 - PnL of LP's in 6 decimals.

#### Parameters

`_price`: `Int`- Price to sync to in 6 decimals

### view_getTerminalAmmPrice

`view_getTerminalAmmPrice` - View function. Return current price, AMM is synced to in it's throws message.

### view_getFunding

`view_getFunding` - View function. Return information about funding state of AMM in it's throws message.1 - long funding in 6 decimals2 - short funding in 6 decimals3 - TWAP 15 minutes of spot price used for funding computation in 6 decimals4 - index price used for funding computation in 6 decimals

### computeSpotPrice

`computeSpotPrice` - Compute function. Returns current spot price in a way that can be used in dApp-to-dApp calls.Returns current spot price in 6 decimals.

### computeFeeForTraderWithArtifact

`computeFeeForTraderWithArtifact` - Compute function. Returns current spot price in a way that can be used in dApp-to-dApp calls.Returns current spot price in 6 decimals.

#### Parameters

`_trader`: `String`- Address of trader
`_artifactId`: `String`- Id of NFT Artifact for fee reduction
