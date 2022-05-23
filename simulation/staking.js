// Сколько заработал протокол
var totalRewardAccumulated = 0
 
// Сколько протокол выплатил инвесторам
var totalRewardClaimed = 0
 
// Сколько стоит виртуальный пай протокола
var vSharePrice = 10 ** 8 / 10 ** 4
 
// Сколько виртуальных паев выпущено всего
var vTotalSupply = 0
 
// Сколько TSN заблокировано в стейкинге
var tsnStaked = 0
 
// Параметры входа каждого инвестора
const investors = {}
 
// Протокол заработал немного (amount) денег.
//
function addStakingReward(amount) {
    // Докинули общее количество заработанного
    totalRewardAccumulated += amount
     
    if (vTotalSupply != 0) {
        // Посчитали новую стоимость пая протокола
        vSharePrice = (totalRewardAccumulated - totalRewardClaimed) / vTotalSupply
    }
}
 
// Пришел инвестор и принес немного TSN в стейкинг
//
function stake(address, tsn) {
    // Докинули общую стоимость заблокированных истов в средства протокола.
    //
    tsnStaked += tsn
     
    // Если не увеличить vTotalSupply - стоимость пая
    // vSharePrice = (totalRewardAccumulated) / vTotalSupply вырастет,
    // а нам надо оставить ее такой же.
    // Поэтому до выпустим новые vShares и начислим их инвестору
    //
    const vShares = ((totalRewardAccumulated - totalRewardClaimed) - vTotalSupply * vSharePrice) / vSharePrice
    vTotalSupply += vShares
 
    if (!investors[address]) {
        investors[address] = {
            totalAmount: 0,
            shares: 0
        }
    }
 
    investors[address].totalAmount += tsn
    investors[address].shares += vShares
}
 
 
// Считаем награду которую потенциально может получить инвестор
//
function reward(address, amount = investors[address].totalAmount) {
    // Если товарисч не сидит - ничего ему и не причитается
    //
    if (!investors[address]) {
        return 0
    }
 
    // Если сидит - получаем его параметры входа.
    //
    const { shares, totalAmount } = investors[address]
 
    // Смотрим сколько vShares он выводит (доля в стейкинге EAST)
    //
    const effectiveShares = shares * (amount / totalAmount)
     
    // Смотрим на сколько всего денег (включая ранее заблокированные EAST)
    //
    const totalFunds = effectiveShares * vSharePrice
 
    return totalFunds
}
 
// Инвестор выходит
function unstake(address, amount) {
    // Не по сеньке шапка
    if (amount > investors[address].amount) {
        throw ('Invalid amount')
    }
    // Получаем награду
    //
    const rewardAmount = reward(address, amount)
 
    // Смотрим сколько shares потратил инвестор
    //
    const spentShares = investors[address].shares * (amount / investors[address].totalAmount)
 
    // Если товарисч вышел не всю котлету - забываем о нем
    //
    if (investors[address].totalAmount === amount) {
        delete investors[address]
    } else {
        // Если нет - уменьшаем его позицию
        investors[address].totalAmount -= amount
        investors[address].shares -= spentShares
    }
 
    // Уменьшаем общее количество истов в стейкинге (возвращаем исты инвестору)
    //
    tsnStaked -= amount
 
    // Сжигаем shares
    //
    vTotalSupply -= spentShares
 
    // Увеличиваем количество выплаченных наград
    //
    totalRewardClaimed += rewardAmount
 
    return rewardAmount
}
 
const run = () => {
    stake("0", 700 * 10**8)
    addStakingReward(30 * 10**8)
    console.log(`vSharePrice=${vSharePrice}`)
 
    stake("1", 1500 * 10**8)
    console.log(`1 reward=${reward("1")}`)
 
    stake("1", 500 * 10**8)
    console.log(`1 reward=${reward("1")}`)
 
    stake("2", 500 * 10**8)
    console.log(`1 reward=${reward("1")}`)
 
    addStakingReward(300 * 10**8)
 
    console.log(`0 reward=${unstake("0", 700 * 10**8)}`)
    console.log(`1 reward=${unstake("1", 1000 * 10**8)}`)
    //console.log(`1 reward=${unstake("1", 500)}`)
    console.log(`2 reward=${unstake("2", 500 * 10**8)}`)
    console.log(`1 reward=${unstake("1", 1000 * 10**8)}`)
}
 
run()