let _qtAstR = 100000
let _bsAstR = 1818

const swapWithImpact = (_isAdd, _quoteAssetAmount) => {
    let k = _qtAstR * _bsAstR

    let quoteAssetReserveAfter = 0

    if (_isAdd) {
        quoteAssetReserveAfter = _qtAstR + _quoteAssetAmount
    } else {
        quoteAssetReserveAfter = _qtAstR - _quoteAssetAmount
    }

    let baseAssetReserveAfter = k / quoteAssetReserveAfter
    let amountBaseAssetBoughtAbs = Math.abs(baseAssetReserveAfter - _bsAstR)
    let amountBaseAssetBought = 0
    if (_isAdd) {
        amountBaseAssetBought = amountBaseAssetBoughtAbs
    } else {
        amountBaseAssetBought = -amountBaseAssetBoughtAbs
    }


    let priceBefore = _qtAstR / _bsAstR
    console.log(`priceBefore=${priceBefore}`)
    let marketPrice = _quoteAssetAmount / amountBaseAssetBoughtAbs
    console.log(`marketPrice=${marketPrice}`)
    let priceDiff = Math.abs(priceBefore - marketPrice)
    console.log(`priceDiff=${Math.abs(priceBefore - marketPrice)}`)
    let priceImpact = 1 - priceBefore / (priceBefore + priceDiff)

    console.log(`priceImpact=${priceImpact}`)
}

swapWithImpact(true, 2500)
swapWithImpact(false, 2500)