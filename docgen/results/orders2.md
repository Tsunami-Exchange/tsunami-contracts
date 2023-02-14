# vAMM3.ride

## Functions

### cleanUpStaleOrders

`cleanUpStaleOrders` -

#### Parameters

`_amm`: `String`
`_trader`: `String`

### setContext

`setContext` -

#### Parameters

`_sender`: `String`

### resetContext

`resetContext` -

### initialize

`initialize` -

#### Parameters

`_coordinator`: `String`

### createOrder

`createOrder` - Function that creates an order.

**note:** limit orders are not supported right now

#### Parameters

`_amm`: `String`- Market address.
`_type`: `Int`- The type of order (e.g. limit, take, stop). STOP = 1, TAKE = 2
`_triggerPrice`: `Int`- The price at which the order is triggered. Never 0. In 6 decimals.
`_limitPrice`: `Int`- The maximum price the user is willing to pay. May be 0. In 6 decimals.
`_amountIn`: `Int`- The amount of the asset to be used. For STOP and TAKE orders it's in base asset. In 6 decimals.
`_leverage`: `Int`- The leverage used in the trade. Only for LIMIT orders.
`_side`: `Int`- The direction of the trade (e.g. LONG or SHORT). LONG = 1, SHORT = 2.
`_refLink`: `String`- A referral link for the order.

### increasePositionWithStopLoss

`increasePositionWithStopLoss` - Function to open new position and add a stop loss / take profit order

#### Parameters

`_amm`: `String`- Market address
`_direction`: `Int`- The direction of the trade (e.g. LONG or SHORT). LONG = 1, SHORT = 2.
`_leverage`: `Int`- The leverage to be used for the trade
`_minBaseAssetAmount`: `Int`- The minimum amount of base asset bought required to open position
`_refLink`: `String`- The reference link if any
`_stopTriggerPrice`: `Int`- The price at which the stop loss order is triggered
`_stopLimitPrice`: `Int`- The limit price for the stop loss order
`_takeTriggerPrice`: `Int`- The price at which the take profit order is triggered
`_takeLimitPrice`: `Int`- The limit price for the take profit order

### internalCreateOrder

`internalCreateOrder` -

#### Parameters

`_trader`: `String`
`_amm`: `String`
`_type`: `Int`
`_triggerPrice`: `Int`
`_limitPrice`: `Int`
`_amountIn`: `Int`
`_leverage`: `Int`
`_side`: `Int`
`_refLink`: `String`
`_paymentAssetId`: `String`
`_paymentAmount`: `Int`

### cancelOrder

`cancelOrder` - Function cancels an existing order.

**note:** can only cancel you own order.

#### Parameters

`_orderId`: `Int`- The ID of the order to be cancelled.

### executeOrder

`executeOrder` - Function executes an existing order (if it's executable). Can be called by anyone, but usually called by keeper bots.

**note:** can only cancel you own order.

#### Parameters

`_orderId`: `Int`- The ID of the order to be executed.

### view_canExecuteOrder

`view_canExecuteOrder` - View Function. Checks if order cn be executed.

#### Parameters

`_orderId`: `Int`- The ID of the order to be checked for execution possibility.
