const DIR_LONG = 1;
const DIR_SHORT = 2;

var fundingPeriod;

var quouteAssetReserve = 0;
var baseAssetReserve = 0;
var baseAssetDeltaThisFundingPeriod = 0;
var cumulativeNotional = 0;
var openInteresetNotional = 0;
var totalPositionSize = 0;
var maintenanceMarginRatio = 0.1 * 10 ** 6;
var initMarginRatio = 0.05 * 10 ** 6;
var liquidationFeeRatio = 0.025 * 10 ** 6;

var latestCumulativePremiumFraction = 0;

var oraclePrice = 0;

var clearingHouseBalance = 0;
var insuranceFundsBalance = 5000 * 10 ** 6;
var nextFundingBlock = 1;
var currentBlock = 1;

var positions = {};

var traderBalances = {};

function mock_advanceToFundingBlock() {
  mock_advanceBlock(nextFundingBlock);
}

function mock_getLatestCumulativePremiumFraction() {
  return latestCumulativePremiumFraction;
}

function mock_advanceBlock(block) {
  if (block <= currentBlock) {
    throw "Invalid block";
  }
  currentBlock = block;
}

function getPosition(investor) {
  if (positions[investor]) {
    return positions[investor];
  }
  return {
    size: 0,
    margin: 0,
    openNotional: 0,
    lastUpdatedCumulativePremiumFraction: 0,
  };
}

const unit = 1 * 10 ** 6;

function divd(x, y) {
  return Math.round((x * unit) / y);
}

function muld(x, y) {
  return Math.round((x * y) / unit);
}

function dec(x) {
  return x * unit;
}

const DAY = dec(86400);

function init(_quouteAssetReserve, _baseAssetReserve, _fundingPeriod) {
  quouteAssetReserve = _quouteAssetReserve;
  baseAssetReserve = _baseAssetReserve;
  baseAssetDeltaThisFundingPeriod = 0;
  nextFundingBlock = nextFundingBlock + 60;
  fundingPeriod = _fundingPeriod;
}

function reset() {
  quouteAssetReserve = 0;
  baseAssetReserve = 0;
  cumulativeNotional = 0;
  oraclePrice = 0;
  totalPositionSize = 0;
  nextFundingBlock = 1;
  currentBlock = 1;
  latestCumulativePremiumFraction = 0;
  insuranceFundsBalance = 5000 * 10 ** 6;
  clearingHouseBalance = 0;
  openInteresetNotional = 0;
  positions = {};
  reservesAtBlock = {};
  traderBalances = {};
}

function updateReserve(_isAdd, _quoteAssetAmount, _baseAssetAmount) {
  var quoteAssetReserveAfter;
  var baseAssetReserveAfter;
  var baseAssetDeltaThisFundingPeriodAfter;
  var totalPositionSizeAfter;
  var cumulativeNotionalAfter;
  if (_isAdd) {
    quoteAssetReserveAfter = quouteAssetReserve + _quoteAssetAmount;
    baseAssetReserveAfter = baseAssetReserve - _baseAssetAmount;
    baseAssetDeltaThisFundingPeriodAfter =
      baseAssetDeltaThisFundingPeriod - _baseAssetAmount;
    totalPositionSizeAfter = totalPositionSize + _baseAssetAmount;
    cumulativeNotionalAfter = cumulativeNotional + _quoteAssetAmount;
  } else {
    quoteAssetReserveAfter = quouteAssetReserve - _quoteAssetAmount;
    baseAssetReserveAfter = baseAssetReserve + _baseAssetAmount;
    baseAssetDeltaThisFundingPeriodAfter =
      baseAssetDeltaThisFundingPeriod + _baseAssetAmount;
    totalPositionSizeAfter = totalPositionSize - _baseAssetAmount;
    cumulativeNotionalAfter = cumulativeNotional - _quoteAssetAmount;
  }

  return [
    quoteAssetReserveAfter,
    baseAssetReserveAfter,
    baseAssetDeltaThisFundingPeriodAfter,
    totalPositionSizeAfter,
    cumulativeNotionalAfter,
  ];
}

function swapInput(_isAdd, _quoteAssetAmoun) {
  const quouteAssetReserveBefore = quouteAssetReserve;
  const baseAssetReserveBefore = baseAssetReserve;
  const k = muld(quouteAssetReserveBefore, baseAssetReserveBefore);

  const quouteAssetReserveAfter = _isAdd
    ? quouteAssetReserveBefore + _quoteAssetAmoun
    : quouteAssetReserveBefore - _quoteAssetAmoun;

  const baseAssetReserveAfter = divd(k, quouteAssetReserveAfter);
  const amountBaseAssetBoughtAbs = Math.abs(
    baseAssetReserveAfter - baseAssetReserveBefore
  );
  const amountBaseAssetBought = _isAdd
    ? amountBaseAssetBoughtAbs
    : -amountBaseAssetBoughtAbs;

  return [
    amountBaseAssetBought,
    ...updateReserve(_isAdd, _quoteAssetAmoun, amountBaseAssetBoughtAbs),
  ];
}

function addMargin(_investor, _addedMargin) {
  const position = getPosition(_investor);

  // WRITES
  positions[_investor].margin = position.margin + _addedMargin;
  clearingHouseBalance += _addedMargin;
}

function removeMargin(_investor, _removedMargin) {
  const position = getPosition(_investor);
  const marginDelta = -_removedMargin;

  const [remainMargin, badDebt, _, latestCumulativePremiumFraction] =
    calcRemainMarginWithFundingPayment(
      position.size,
      position.margin,
      position.lastUpdatedCumulativePremiumFraction,
      marginDelta
    );

  if (badDebt != 0) {
    throw Error("Invalid margin");
  }

  // WRITES
  //
  positions[_investor].margin = remainMargin;
  positions[_investor].lastUpdatedCumulativePremiumFraction =
    latestCumulativePremiumFraction;

  clearingHouseBalance -= _removedMargin;
}

function mock_getPositionBadDebtAndFundingPayment(_investor) {
  const position = getPosition(_investor);
  const [_, unrealizedPnl] = getPositionNotionalAndUnrealizedPnl(_investor);

  const [__, badDebt, fundingPayment, ___] = calcRemainMarginWithFundingPayment(
    position.size,
    position.margin,
    position.lastUpdatedCumulativePremiumFraction,
    unrealizedPnl
  );
  return [badDebt, fundingPayment];
}

function calcRemainMarginWithFundingPayment(
  _oldPositionSize,
  _oldPositionMargin,
  _oldPositionLastUpdatedCumulativePremiumFraction,
  _marginDelta
) {
  // calculate funding payment
  //
  var fundingPayment = 0;
  if (_oldPositionSize != 0) {
    fundingPayment = muld(
      latestCumulativePremiumFraction -
        _oldPositionLastUpdatedCumulativePremiumFraction,
      _oldPositionSize
    );
  }

  // calculate remain margin
  //
  const signedMargin = _marginDelta - fundingPayment + _oldPositionMargin;

  var remainMargin = 0;
  var badDebt = 0;
  if (signedMargin < 0) {
    badDebt = Math.abs(signedMargin);
  } else {
    remainMargin = Math.abs(signedMargin);
  }

  return [
    remainMargin,
    badDebt,
    fundingPayment,
    latestCumulativePremiumFraction,
  ];
}

function closePosition(_investor, _minQuoteAssetAmount = 0) {
  const [
    _1,
    badDebt,
    _3,
    marginToVault,
    quoteAssetReserveAfter,
    baseAssetReserveAfter,
    baseAssetDeltaThisFundingPeriodAfter,
    totalPositionSizeAfter,
    cumulativeNotionalAfter,
    openInteresetNotionalAfter,
  ] = internalClosePosition(_investor);

  var takeFromInsuranceFund = 0;
  var takeFromClearingHouse = Math.abs(marginToVault);
  if (marginToVault < 0 && Math.abs(marginToVault) > clearingHouseBalance) {
    takeFromInsuranceFund = Math.abs(marginToVault) - clearingHouseBalance;
    takeFromClearingHouse = clearingHouseBalance;
  }

  // WRITES
  //
  delete positions[_investor];

  // TOO: Fee
  quouteAssetReserve = quoteAssetReserveAfter;
  baseAssetReserve = baseAssetReserveAfter;
  baseAssetDeltaThisFundingPeriod = baseAssetDeltaThisFundingPeriodAfter;
  totalPositionSize = totalPositionSizeAfter;
  cumulativeNotional = cumulativeNotionalAfter;
  openInteresetNotional = openInteresetNotionalAfter;

  clearingHouseBalance -= takeFromClearingHouse;
  insuranceFundsBalance -= takeFromInsuranceFund;

  console.log(marginToVault);
}

function internalClosePosition(_investor) {
  const oldPosition = getPosition(_investor);
  const oldPositionSize = oldPosition.size;

  const [_1, unrealizedPnl] = getPositionNotionalAndUnrealizedPnl(_investor);
  const [remainMargin, badDebt, _2] = calcRemainMarginWithFundingPayment(
    oldPositionSize,
    oldPosition.margin,
    oldPosition.lastUpdatedCumulativePremiumFraction,
    unrealizedPnl
  );

  const exchangedPositionSize = -oldPositionSize;
  const realizedPnl = unrealizedPnl;
  const marginToVault = -remainMargin;

  const [
    exchangedQuoteAssetAmount,
    quoteAssetReserveAfter,
    baseAssetReserveAfter,
    baseAssetDeltaThisFundingPeriodAfter,
    totalPositionSizeAfter,
    cumulativeNotionalAfter,
  ] = getOutputPriceWithReserves(
    oldPositionSize > 0 ? true : false,
    Math.abs(oldPositionSize),
    quouteAssetReserve,
    baseAssetReserve
  );

  const openInteresetNotionalAfter =
    openInteresetNotional - oldPosition.openNotional;

  return [
    exchangedPositionSize,
    badDebt,
    realizedPnl,
    marginToVault,
    quoteAssetReserveAfter,
    baseAssetReserveAfter,
    baseAssetDeltaThisFundingPeriodAfter,
    totalPositionSizeAfter,
    cumulativeNotionalAfter,
    openInteresetNotionalAfter,
    exchangedQuoteAssetAmount,
  ];
}

function openPosition(
  _investor,
  _direction,
  _amount,
  _leverage,
  _minBaseAssetAmount = 0
) {
  requireMoreMarginRatio(divd(unit, _leverage), initMarginRatio, true);

  const oldPosition = getPosition(_investor);
  const isNewPosition = oldPosition.size === 0;
  const expandExisting =
    !isNewPosition &&
    (oldPosition.size > 0 ? DIR_LONG : DIR_SHORT) == _direction;

  let newPosition = {};
  let newAmmState = {};

  const isAdd = _direction === DIR_LONG;

  if (isNewPosition || expandExisting) {
    // Increase position
    const openNotional = muld(_amount, _leverage);
    const [
      amountBaseAssetBought,
      quouteAssetReserveAfter,
      baseAssetReserveAfter,
      baseAssetDeltaThisFundingPeriodAfter,
      totalPositionSizeAfter,
      cumulativeNotionalAfter,
    ] = swapInput(isAdd, openNotional);

    if (
      _minBaseAssetAmount !== 0 &&
      amountBaseAssetBought < _minBaseAssetAmount
    ) {
      throw Error("Too little bassed asset bought");
    }

    const newPositionSize = oldPosition.size + amountBaseAssetBought;
    const increaseMarginRequirement = divd(openNotional, _leverage);

    const [remainMargin, _, __, oldLatestCumulativePremiumFraction] =
      calcRemainMarginWithFundingPayment(
        oldPosition.size,
        oldPosition.margin,
        oldPosition.lastUpdatedCumulativePremiumFraction,
        increaseMarginRequirement
      );

    newPosition.size = newPositionSize;
    newPosition.margin = remainMargin;
    newPosition.openNotional = oldPosition.openNotional + openNotional;
    newPosition.lastUpdatedCumulativePremiumFraction =
      oldLatestCumulativePremiumFraction;

    newAmmState.baseAssetReserve = baseAssetReserveAfter;
    newAmmState.quouteAssetReserve = quouteAssetReserveAfter;
    newAmmState.baseAssetDeltaThisFundingPeriodAfter =
      baseAssetDeltaThisFundingPeriodAfter;
    newAmmState.totalPositionSizeAfter = totalPositionSizeAfter;
    newAmmState.cumulativeNotionalAfter = cumulativeNotionalAfter;
    newAmmState.openInteresetNotional = openInteresetNotional + openNotional;
  } else {
    const openNotional = muld(_amount, _leverage);
    const [oldPositionNotional, unrealizedPnl] =
      getPositionNotionalAndUnrealizedPnl(_investor);

    // reduce position if old position is larger
    if (oldPositionNotional > openNotional) {
      const [
        exchangedPositionSize,
        quouteAssetReserveAfter,
        baseAssetReserveAfter,
        baseAssetDeltaThisFundingPeriodAfter,
        totalPositionSizeAfter,
        cumulativeNotionalAfter,
      ] = swapInput(isAdd, openNotional);

      if (
        _minBaseAssetAmount !== 0 &&
        Math.abs(exchangedPositionSize) < _minBaseAssetAmount
      ) {
        throw Error("Too little basse asset bought");
      }

      let realizedPnl = 0;
      if (oldPosition.size != 0) {
        realizedPnl = divd(
          muld(unrealizedPnl, Math.abs(exchangedPositionSize)),
          oldPosition.size
        );
      }

      [
        remainMargin,
        badDebt,
        fundingPayment,
        oldLatestCumulativePremiumFraction,
      ] = calcRemainMarginWithFundingPayment(
        oldPosition.size,
        oldPosition.margin,
        oldPosition.lastUpdatedCumulativePremiumFraction,
        realizedPnl
      );

      const exchangedQuoteAssetAmount = openNotional;

      const unrealizedPnlAfter = unrealizedPnl - realizedPnl;
      const remainOpenNotional =
        oldPosition.size > 0
          ? oldPositionNotional - exchangedQuoteAssetAmount - unrealizedPnlAfter
          : unrealizedPnlAfter +
            oldPositionNotional -
            exchangedQuoteAssetAmount;

      newPosition.size = oldPosition.size + exchangedPositionSize;
      newPosition.margin = remainMargin;
      newPosition.openNotional = Math.abs(remainOpenNotional);
      newPosition.lastUpdatedCumulativePremiumFraction =
        oldLatestCumulativePremiumFraction;

      newAmmState.baseAssetReserve = baseAssetReserveAfter;
      newAmmState.quouteAssetReserve = quouteAssetReserveAfter;
      newAmmState.baseAssetDeltaThisFundingPeriodAfter =
        baseAssetDeltaThisFundingPeriodAfter;
      newAmmState.totalPositionSizeAfter = totalPositionSizeAfter;
      newAmmState.cumulativeNotionalAfter = cumulativeNotionalAfter;
      newAmmState.openInteresetNotional = openInteresetNotional - openNotional;
    } else {
      throw "Close position first";
    }
  }

  // WRITES
  //
  positions[_investor] = newPosition;

  // AMM STATE
  //
  quouteAssetReserve = newAmmState.quouteAssetReserve;
  baseAssetReserve = newAmmState.baseAssetReserve;
  baseAssetDeltaThisFundingPeriod =
    newAmmState.baseAssetDeltaThisFundingPeriodAfter;
  totalPositionSize = newAmmState.totalPositionSizeAfter;
  cumulativeNotional = newAmmState.cumulativeNotionalAfter;
  openInteresetNotional = newAmmState.openInteresetNotional;

  // VAULT STATE
  //
  clearingHouseBalance += _amount;
}

function getPositionNotionalAndUnrealizedPnl(_trader) {
  const position = getPosition(_trader);
  const positionSizeAbs = Math.abs(position.size);
  if (positionSizeAbs === 0) {
    return 0;
  }

  const isShort = position.size < 0;
  const [positionNotional] = getOutputPriceWithReserves(
    !isShort,
    positionSizeAbs,
    quouteAssetReserve,
    baseAssetReserve
  );

  const unrealizedPnl = isShort
    ? position.openNotional - positionNotional
    : positionNotional - position.openNotional;

  return [positionNotional, unrealizedPnl];
}

function getOutputPriceWithReserves(
  _add,
  _baseAssetAmount,
  _quoteAssetPoolAmount,
  _baseAssetPoolAmount
) {
  if (_baseAssetAmount == 0) {
    return 0;
  }

  const k = muld(_quoteAssetPoolAmount, _baseAssetPoolAmount);
  const baseAssetPoolAmountAfter = _add
    ? _baseAssetPoolAmount + _baseAssetAmount
    : _baseAssetPoolAmount - _baseAssetAmount;

  const quoteAssetAfter = divd(k, baseAssetPoolAmountAfter);
  const quoteAssetSold = Math.abs(quoteAssetAfter - _quoteAssetPoolAmount);

  return [
    quoteAssetSold,
    ...updateReserve(!_add, quoteAssetSold, _baseAssetAmount),
  ];
}

function getUnderlyingTwapPrice() {
  return oraclePrice;
}

function getTwapSpotPrice() {
  return divd(quouteAssetReserve, baseAssetReserve);
}

function payFunding() {
  if (currentBlock < nextFundingBlock) {
    throw Error("Not a time for funding");
  }

  const underlyingPrice = getUnderlyingTwapPrice();
  const spotTwapPrice = getTwapSpotPrice();
  const premium = spotTwapPrice - underlyingPrice;

  const premiumFraction = divd(muld(premium, fundingPeriod), DAY); // !!
  const totalTraderPositionSize = totalPositionSize;
  const ammFundingPaymentProfit = muld(
    premiumFraction,
    totalTraderPositionSize
  );

  if (ammFundingPaymentProfit > 0) {
    insuranceFundsBalance += Math.abs(ammFundingPaymentProfit);
    clearingHouseBalance -= Math.abs(ammFundingPaymentProfit);
  } else {
    insuranceFundsBalance -= Math.abs(ammFundingPaymentProfit);
    clearingHouseBalance += Math.abs(ammFundingPaymentProfit);
  }

  // WRITES
  //
  baseAssetDeltaThisFundingPeriod = 0;
  nextFundingBlock = nextFundingBlock + 60;
  latestCumulativePremiumFraction =
    latestCumulativePremiumFraction + premiumFraction;
  fundingRate = divd(premiumFraction, underlyingPrice);
}

function getMarginRatio(_trader) {
  const position = getPosition(_trader);

  const [positionNotional, unrealizedPnl] =
    getPositionNotionalAndUnrealizedPnl(_trader);
  const [remainMargin, badDebt] = calcRemainMarginWithFundingPayment(
    position.size,
    position.margin,
    position.lastUpdatedCumulativePremiumFraction,
    unrealizedPnl
  );

  return divd(remainMargin - badDebt, positionNotional);
}

function liquidate(_liquidator, _investor) {
  requireMoreMarginRatio(
    getMarginRatio(_investor),
    maintenanceMarginRatio,
    false
  );

  const [
    _1,
    badDebt,
    _2,
    marginToVault,
    quoteAssetReserveAfter,
    baseAssetReserveAfter,
    baseAssetDeltaThisFundingPeriodAfter,
    totalPositionSizeAfter,
    cumulativeNotionalAfter,
    openInteresetNotionalAfter,
    exchangedQuoteAssetAmount,
  ] = internalClosePosition(_investor);

  //var liquidationPenalty = 0
  var liquidationBadDebt = 0;
  const feeToLiquidator =
    muld(exchangedQuoteAssetAmount, liquidationFeeRatio) / 2;
  //var feeToInsuranceFund = 0

  // 224.089635855963718818
  //liquidationPenalty = getPosition(_investor).margin
  var remainMargin = marginToVault;
  var totalBadDebt = badDebt;
  if (feeToLiquidator > remainMargin) {
    liquidationBadDebt = feeToLiquidator - remainMargin;
    totalBadDebt = totalBadDebt + liquidationBadDebt;
  } else {
    remainMargin = remainMargin - feeToLiquidator;
  }

  // TODO: liquidationFee goes to _liquidator
  if (!traderBalances[_liquidator]) {
    traderBalances[_liquidator] = 0;
  }

  traderBalances[_liquidator] =
    traderBalances[_liquidator] + Math.abs(feeToLiquidator);

  // WRITES
  delete positions[_investor];

  // TOO: Fee
  quouteAssetReserve = quoteAssetReserveAfter;
  baseAssetReserve = baseAssetReserveAfter;
  baseAssetDeltaThisFundingPeriod = baseAssetDeltaThisFundingPeriodAfter;
  totalPositionSize = totalPositionSizeAfter;
  cumulativeNotional = cumulativeNotionalAfter;
  openInteresetNotional = openInteresetNotionalAfter;

  clearingHouseBalance -= Math.abs(marginToVault);
  insuranceFundsBalance -= badDebt;
  if (feeToLiquidator > remainMargin) {
    insuranceFundsBalance -= feeToLiquidator;
  }
}

function requireMoreMarginRatio(
  _marginRatio,
  _baseMarginRatio,
  _largerThanOrEqualTo
) {
  const remainingMarginRatio = _marginRatio - _baseMarginRatio;
  if (_largerThanOrEqualTo && remainingMarginRatio < 0) {
    throw Error("Invalid margin");
  }
  if (!_largerThanOrEqualTo && remainingMarginRatio >= 0) {
    throw Error("Invalid margin");
  }
}

function dump() {
  console.log(`==========================================`);
  console.log(`= insuranceFunds: ${insuranceFundsBalance}`);
  console.log(`= clearingHouse: ${clearingHouseBalance}`);
  console.log(`= vAMM(Quote): ${quouteAssetReserve / 10 ** 6}`);
  console.log(`= vAMM(Base): ${baseAssetReserve / 10 ** 6}`);
  console.log(`= Positions: ${JSON.stringify(positions, null, 2)}`);
  console.log(`==========================================`);
}

function setTwapPrice(price) {
  oraclePrice = price;
}

function getPersonalBalanceWithFundingPayment(_trader) {
  return getPersonalPositionWithFundingPayment(_trader).margin;
}

function getPersonalPositionWithFundingPayment(_trader) {
  const position = getPosition(_trader);
  const marginWithFundingPayment =
    position.margin +
    getFundingPayment(position, latestCumulativePremiumFraction);
  return {
    ...position,
    margin: marginWithFundingPayment >= 0 ? marginWithFundingPayment : 0,
  };
}

function getFundingPayment(position, latestCumulativePremiumFraction) {
  if (position.size === 0) {
    return 0;
  } else {
    const cumulativePremiumFractionDelta =
      latestCumulativePremiumFraction -
      position.lastUpdatedCumulativePremiumFraction;
    const positionSizeDeltaFraction = muld(
      cumulativePremiumFractionDelta,
      position.size
    );
    return -positionSizeDeltaFraction;
  }
}

function openInterestNotionalMap() {
  return openInteresetNotional;
}

function getClearingHouseBalance() {
  return clearingHouseBalance;
}

function getInsuranceFundBalance() {
  return insuranceFundsBalance;
}

function balanceOf(_trader) {
  return traderBalances[_trader];
}

function getQuoteAssetReserve() {
  return quouteAssetReserve;
}

function getBaseAssetReserve() {
  return baseAssetReserve;
}

function debug_calcRemainMarginWithFundingPayment(_trader) {
  let position = getPosition(_trader);
  let positionSize = position.size;
  let positionMargin = position.margin;
  let positionLastUpdatedCumulativePremiumFraction =
    position.lastUpdatedCumulativePremiumFraction;
  let [positionNotional, unrealizedPnl] =
    getPositionNotionalAndUnrealizedPnl(_trader);
  let [remainMargin, badDebt, fundingPayment] =
    calcRemainMarginWithFundingPayment(
      positionSize,
      positionMargin,
      positionLastUpdatedCumulativePremiumFraction,
      unrealizedPnl
    );
  throw (
    "positionSize=" +
    positionSize.toString() +
    " positionMargin=" +
    positionMargin.toString() +
    " positionLastUpdatedCumulativePremiumFraction=" +
    positionLastUpdatedCumulativePremiumFraction.toString() +
    " positionNotional=" +
    positionNotional.toString() +
    " unrealizedPnl=" +
    unrealizedPnl.toString() +
    " remainMargin=" +
    remainMargin.toString() +
    " badDebt=" +
    badDebt.toString() +
    " fundingPayment=" +
    fundingPayment.toString()
  );
}

module.exports = {
  init,
  reset,
  openPosition,
  closePosition,
  dump,
  liquidate,
  setTwapPrice,
  payFunding,
  getPersonalPositionWithFundingPayment,
  openInterestNotionalMap,
  DIR_LONG,
  DIR_SHORT,
  mock_advanceToFundingBlock,
  mock_getLatestCumulativePremiumFraction,
  getTwapSpotPrice,
  getClearingHouseBalance,
  getInsuranceFundBalance,
  getPersonalBalanceWithFundingPayment,
  removeMargin,
  mock_getPositionBadDebtAndFundingPayment,
  addMargin,
  getMarginRatio,
  getPosition,
  balanceOf,
  getQuoteAssetReserve,
  getBaseAssetReserve,
  debug_calcRemainMarginWithFundingPayment,
};
