const _tsn = "GSm9yGjTcc1FxqkuBXFuhMoFGSMCzdDPunEcEZvkM9hJ"
const _neutrino = "HezsdQuRDtzksAYUy97gfhKy7Z1NW2uXYSHA3bgqenNZ"
const _neutrinoStaking = "3N9LkJahTMx41wGhSxLS42prCZtRCp4dhTs"

const wvs = 10 ** 8;
const decimals = 10 ** 6;

const wait = t => new Promise(s => setTimeout(s, t, t));

const deploy = async (filename, fee, seed, name, injectTimer, timerAddress) => {
    let code = file(filename)
    if (injectTimer) {
        code = code.replace('lastBlock.timestamp', `addressFromStringValue("${timerAddress}").getInteger("timestamp").valueOrElse(${new Date().getTime()})`)
        console.log(`Injected timer to ${name}`)
    }
    const script = compile(code)
    const tx = setScript({ script, fee}, seed);
    await broadcast(tx);
    console.log(`${name} deployed to ${address(seed)} in ${tx.id}`)
    return waitForTx(tx.id)
}

class Environment {

    constructor(admin) {
        this.seeds = {}
        this.assets = {}
        this.addresses = {}

        this.seeds.admin = admin

        console.log(`Created new Environment adminAddress=${this.seeds.admin}`)

        if (env.CHAIN_ID === "R") {
            console.log(`Running in local environment...`)
            this.isLocal = true
        } else {
            this.isLocal = false
        }
    }

    async deploy() {
        console.log(`Begin deploy new environment...`)
        await setupAccounts({
            coordinator:    0.05 * wvs,
            insurance:      0.05 * wvs,
            staking:        0.05 * wvs,
            oracle:         0.01 * wvs,
            miner:          0.05 * wvs,
        });

        this.seeds.coordinator  = accounts.coordinator
        this.seeds.insurance    = accounts.insurance
        this.seeds.staking      = accounts.staking
        this.seeds.oracle       = accounts.oracle
        this.seeds.miner        = accounts.miner

        if (this.isLocal) {
            await setupAccounts({
                assetHolder:        3    * wvs,
                neutrinoStaking:    0.15 * wvs,
                timer:              3    * wvs,
            });

            this.seeds.assetHolder = accounts.assetHolder
            this.seeds.neutrinoStaking = accounts.neutrinoStaking
            this.seeds.timer = accounts.timer

            // Issue TSN and Neutrino assets
            //
            const tx1 = issue({
                quantity: 1000000000 * decimals,
                name: "Neutrino",
                description: "Neutrino",
                decimals: 6
            }, this.seeds.assetHolder)

            const tx2 = issue({
                quantity: 1000000000 * wvs,
                name: "Tsunami",
                description: "Tsunami",
                decimals: 8
            }, this.seeds.assetHolder)

            const iTx1 = await broadcast(tx1)
            const iTx2 = await broadcast(tx2)

            let p1 = deploy('mock_neutrinoStaking.ride' , 3400000, this.seeds.neutrinoStaking , 'Mock Neutrino Staking')

            await Promise.all([waitForTx(iTx1.id), waitForTx(iTx2.id, p1)])

            this.assets.tsn         = iTx2.assetId
            this.assets.neutrino    = iTx1.assetId
            
            this.addresses.neutrinoStaking = address(this.seeds.neutrinoStaking)

            console.log(`Initialized local mock env:`)
            console.log(`TSN Token: ${this.assets.tsn}`)
            console.log(`USDN Token: ${this.assets.neutrino}`)
            console.log(`USDN Staking: ${this.addresses.neutrinoStaking}`)
        }

        let p1 = deploy('coordinator.ride' , 3400000, this.seeds.coordinator , 'Coordinator')
        let p2 = deploy('insurance.ride'   , 3400000, this.seeds.insurance   , 'Insurance Fund')
        let p4 = deploy('mining.ride'      , 3400000, this.seeds.miner       , 'Miner', this.isLocal, address(this.seeds.timer))

        let period = Math.floor((new Date()).getTime() / 1000 / 604800)

        let seedOracleTx = data({
            data: [
                {
                    "key": `price_${period}_${this.assets.tsn}`,
                    "type": "integer",
                    "value": Math.round(4 * decimals)
                }
            ]
        }, this.seeds.oracle)

        await broadcast(seedOracleTx)
        console.log(`Seed oracle in ${seedOracleTx.id}`)

        await Promise.all([p1, p2, p4, seedOracleTx])

        // Init coordinator
        {
            console.log(`Setting admin...`)
            const addAdminTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "setAdmin",
                arguments: [ publicKey(accounts.admin) ],
            }, this.seeds.admin)

            console.log(`setAdmin in ${addAdminTx.id}`)
            await waitForTx(addAdminTx.id)

            const setInsuranceFundTx = await invoke({
                dApp: address(this.seeds.coordinator),
                functionName: "setInsuranceFund",
                arguments: [ address(this.seeds.insurance) ]
            }, this.seeds.admin)

            console.log(`setInsuranceFund in ${setInsuranceFundTx.id}`)

            const setMinerTx = await invoke({
                dApp: address(this.seeds.coordinator),
                functionName: "setLiquidityMiner",
                arguments: [ address(this.seeds.miner) ]
            }, this.seeds.admin)

            console.log(`setLiquidityMiner in ${setMinerTx.id}`)
            
            const setQuoteAssetTx = await invoke({
                dApp: address(this.seeds.coordinator),
                functionName: "setQuoteAsset",
                arguments: [ this.assets.neutrino, this.addresses.neutrinoStaking ]
            }, this.seeds.admin)

            console.log(`setQuoteAsset in ${setQuoteAssetTx.id}`)

            const setStakingAddressTx = await invoke({
                dApp: address(this.seeds.coordinator),
                functionName: "setStakingAddress",
                arguments: [ address(this.seeds.staking) ]
            }, this.seeds.admin)

            console.log(`setStakingAddress in ${setStakingAddressTx.id}`)

            await waitForTx(setInsuranceFundTx.id)
            await waitForTx(setQuoteAssetTx.id)
            await waitForTx(setStakingAddressTx.id)
            await waitForTx(setMinerTx.id)
        }

        // Init insurance
        {
            const initInsuranceTx = await invoke({
                dApp: address(this.seeds.insurance),
                functionName: "initialize",
                arguments: [ address(this.seeds.coordinator) ]
            }, this.seeds.admin)

            await waitForTx(initInsuranceTx.id)
            console.log('Insurance initialized in ' + initInsuranceTx.id)
        }

        // Init miner
        {
            const initMinerTx = await invoke({
                dApp: address(this.seeds.miner),
                functionName: "initialize",
                arguments: [ address(this.seeds.coordinator), address(this.seeds.oracle) ]
            }, this.seeds.admin)

            await waitForTx(initMinerTx.id)
            console.log('Miner initialized in ' + initMinerTx.id)
        }

        this.insurance = new Insurance(this)
        this.miner = new Miner(this)

        console.log(`Environment deployed`)
    }

    async deployAmm(_liquidity, _price, options = {}) {
        await setupAccounts({
            amm: 0.05 * wvs,
        });

        this.seeds.amm = accounts.amm

        let seedOracleTx = data({
            data: [
                {
                    "key": "price",
                    "type": "integer",
                    "value": Math.round(_price * decimals)
                }
            ]
        }, this.seeds.oracle)

        await broadcast(seedOracleTx)
        console.log(`Seed AMM oracle in ${seedOracleTx.id}`)

        let p3 = deploy('vAMM2.ride', 4700000, this.seeds.amm, 'vAMM')

        const addAmmTx = await invoke({
            dApp: address(this.seeds.coordinator),
            functionName: "addAmm",
            arguments: [ address(this.seeds.amm), "" ]
        }, this.seeds.admin)

        console.log(`addAmm in ${addAmmTx.id}`)

        await Promise.all([
            p3,
            waitForTx(addAmmTx.id),
            waitForTx(seedOracleTx.id)
        ])

        {
            const initTx = invokeScript({
                dApp: address(this.seeds.amm),
                call: {
                    function: "initialize",
                    args: [
                        { type: 'integer', value: Math.round(_liquidity             * decimals) },   // _quoteAssetReserve
                        { type: 'integer', value: Math.round((_liquidity / _price)  * decimals) },   // _baseAssetReserve ~ 55 USDN / Waves (Optimistic!)
                        { type: 'integer', value: 60 },                  // _fundingPeriod = 1 minute
                        { type: 'integer', value: Math.round(0.05  * decimals) },    // _initMarginRatio = 5%
                        { type: 'integer', value: Math.round(0.085 * decimals) },    // _maintenanceMarginRatio = 10%
                        { type: 'integer', value: Math.round(0.05  * decimals) },    // _liquidationFeeRatio = 5%
                        { type: 'integer', value: Math.round(0.01  * decimals) },    // _fee 1%
                        { type: 'string' , value: address(this.seeds.oracle) },    // Oracle address
                        { type: 'string' , value: 'price' },                                  // Oracle key
                        { type: 'string' , value: address(this.seeds.coordinator) },            // Coordinator address,
                        { type: 'integer', value: Math.round(0.1   * decimals) },    // _spreadLimit 10%
                        { type: 'integer', value: Math.round((options.maxPriceImpact || 0.08)  * decimals) },    // _maxPriceImpact 8%
                    ]
                },
            }, this.seeds.admin);

            await broadcast(initTx);
            await waitForTx(initTx.id)
        
            console.log('vAMM initialized in ' + initTx.id)
        }

        return new AMM(this)
    }

    async addAmm(_amm) {
        const addAmmTx = await invoke({
            dApp: address(this.seeds.coordinator),
            functionName: "addAmm",
            arguments: [ address(_amm), "" ]
        }, this.seeds.admin)

        await waitForTx(addAmmTx.id)
        console.log(`addAmm in ${addAmmTx.id}`)
        return addAmmTx
    }

    async supplyUsdn(_amount, _recipient) {
        let amount = _amount * decimals

        let tx = await broadcast(transfer({
            recipient: _recipient,
            amount,
            assetId: this.assets.neutrino
        }, this.seeds.assetHolder))

        await waitForTx(tx.id)
        return tx
    }

    async supplyTsn(_amount, _recipient) {
        let amount = _amount * wvs

        let tx = await broadcast(transfer({
            recipient: _recipient,
            amount,
            assetId: this.assets.tsn
        }, this.seeds.assetHolder))

        await waitForTx(tx.id)
        return tx
    }

    async fundAccounts(request) {
        await Promise.all(Object.keys(request).map(
            r => this.supplyUsdn(request[r], address(r))
        ))
    }

    async setTime(_timestamp) {
        if (!this.isLocal) {
            throw("Can set time only in local env")
        }

        let setTimerTx = data({
            data: [
                {
                    "key": "timestamp",
                    "type": "integer",
                    "value": _timestamp
                }
            ]
        }, this.seeds.timer)

        await broadcast(setTimerTx)
        await waitForTx(setTimerTx.id)

        console.log(`Set new time in ${setTimerTx.id}`)
        return setTimerTx
    }

    async setOracleAssetPrice(_assetId, _price) {
        let period = Math.floor((new Date()).getTime() / 1000 / 604800)

        let seedOracleTx = data({
            data: [
                {
                    "key": `price_${period}_${_assetId}`,
                    "type": "integer",
                    "value": Math.round(_price * decimals)
                }
            ]
        }, this.seeds.oracle)

        await broadcast(seedOracleTx)
        await waitForTx(seedOracleTx.id)
        console.log(`Updated oracle in ${seedOracleTx.id}`)
    }
}

class AMM {
    constructor(e, sender) {
        this.e = e
        this.sender = sender
    }

    as(_sender) {
        return new AMM(this.e, _sender)
    }

    async increasePosition(_amount, _direction, _leverage, _minBaseAssetAmount) {
        const openPositionTx = invokeScript({
            dApp: address(this.e.seeds.amm),
            call: {
                   function: "increasePosition",
                args: [
                    { type: 'integer', value: _direction }, // _direction = LONG
                    { type: 'integer', value: _leverage * decimals }, // _leverage = 3
                    { type: 'integer', value: _minBaseAssetAmount * decimals }, // _minBaseAssetAmount = 0.1 WAVES
                ]
            },
            payment: [
                {
                    amount: _amount * decimals,
                    assetId: this.e.assets.neutrino
                }
            ]
        }, this.sender)

        await broadcast(openPositionTx);
        await waitForTx(openPositionTx.id);

        return openPositionTx
    }

    async decreasePosition(_amount, _leverage, _minBaseAssetAmount) {
        const decreasePositionTx = invokeScript({
            dApp: address(this.e.seeds.amm),
            call: {
                function: "decreasePosition",
                args: [
                    { type: 'integer', value: Math.round(_amount * decimals) }, // _amount = 3
                    { type: 'integer', value: Math.round(_leverage * decimals) }, // _leverage = 3
                    { type: 'integer', value: Math.round(_minBaseAssetAmount * decimals) }, // _minBaseAssetAmount = 0.1 WAVES
                ]
            }
        }, this.sender)

        await broadcast(decreasePositionTx);
        await waitForTx(decreasePositionTx.id);

        return decreasePositionTx
    }

    async addMargin(_amount) {
        const addMarginTx = invokeScript({
            dApp: address(this.e.seeds.amm),
            call: {
                function: "addMargin",
                args: [],
            },
            payment: [
                {
                    amount: _amount * decimals,
                    assetId: this.e.assets.neutrino
                }
            ]
        }, this.sender)

        await broadcast(addMarginTx);
        await waitForTx(addMarginTx.id);

        return addMarginTx
    }

    async removeMargin(_amount) {
        const removeMarginTx = invokeScript({
            dApp: address(this.e.seeds.amm),
            call: {
                function: "removeMargin",
                args: [
                    { type: 'integer', value: _amount * decimals }
                ],
            }
        }, this.sender)

        await broadcast(removeMarginTx);
        await waitForTx(removeMarginTx.id);


        return removeMarginTx
    }

    async closePosition(_amount) {
        const closePositionTx = invokeScript({
            dApp: address(this.e.seeds.amm),
            call: {
                function: "closePosition"
            }
        }, this.sender)

        await broadcast(closePositionTx);
        await waitForTx(closePositionTx.id);

        return closePositionTx
    }

    async liquidate(_trader) {
        const liquidatePositionTx = invokeScript({
            dApp: address(this.e.seeds.amm),
            call: {
                function: "liquidate",
                args: [
                    { type: 'string', value: address(_trader) }
                ]
            }
        }, this.sender)

        console.log('Position liquidated by ' + liquidatePositionTx.id)

        await broadcast(liquidatePositionTx);   
        await waitForTx(liquidatePositionTx.id);

        return liquidatePositionTx
    }

    async awaitNextFunding() {
        let dApp = address(this.e.seeds.amm)
        let nextFundingBlockTsV = await accountDataByKey("k_nextFundingBlockMinTimestamp", dApp)
        let nextFundingBlockTs = nextFundingBlockTsV.value

        while(new Date().getTime() <= nextFundingBlockTs) {
            await wait(500)
        }

        await waitNBlocks(1)
    }

    async payFunding() {
        const payFundingTx = invokeScript({
            dApp: address(this.e.seeds.amm),
            call: {
                function: "payFunding",
                args: []
            }
        }, this.e.seeds.admin)

        console.log('Paid funding tx: ' + payFundingTx.id)

        await broadcast(payFundingTx);   
        await waitForTx(payFundingTx.id);

        return payFundingTx
    }

    async getPositionInfo(_trader) {
        let trader = address(_trader)
        let dApp = address(this.e.seeds.amm)
        
        let size = await accountDataByKey(`k_positionSize_${trader}`, dApp).then(x => x.value)
        let margin = await accountDataByKey(`k_positionMargin_${trader}`, dApp).then(x => x.value)
        let openNotional = await accountDataByKey(`k_positionOpenNotional_${trader}`, dApp).then(x => x.value)

        return {
            size,
            margin,
            openNotional
        }
    }

    async totalPositionInfo() {
        let dApp = address(this.e.seeds.amm)

        let totalSize = await accountDataByKey(`k_totalPositionSize`, dApp).then(x => x.value)
        let totalLong = await accountDataByKey(`k_totalLongPositionSize`, dApp).then(x => x.value)
        let totalShort = await accountDataByKey(`k_totalShortPositionSize`, dApp).then(x => x.value)

        return {
            totalSize,
            totalLong,
            totalShort
        }
    }

    async getMarketPrice() {
        let dApp = address(this.e.seeds.amm)
        let quote = await accountDataByKey(`k_qtAstR`, dApp).then(x => x.value)
        let base = await accountDataByKey(`k_bsAstR`, dApp).then(x => x.value)

        return Number.parseFloat((quote / base).toFixed(4))
    }

    async syncOraclePriceWithMarketPrice() {
        let price = await this.getMarketPrice()

        let seedOracleTx = data({
            data: [
                {
                    "key": "price",
                    "type": "integer",
                    "value": Math.round(price * decimals)
                }
            ]
        }, this.e.seeds.oracle)

        await broadcast(seedOracleTx)
        await waitForTx(seedOracleTx.id)

        console.log(`Sync Market and Oracle price in ${seedOracleTx.id}`)
        return seedOracleTx
    }

    async setOraclePrice(_price) {
        let seedOracleTx = data({
            data: [
                {
                    "key": "price",
                    "type": "integer",
                    "value": Math.round(_price * decimals)
                }
            ]
        }, this.e.seeds.oracle)

        await broadcast(seedOracleTx)
        await waitForTx(seedOracleTx.id)

        console.log(`Set Oracle price in ${seedOracleTx.id}`)
        return seedOracleTx
    }

    async getPositionActualData(_trader) {
        let trader = address(_trader)

        const invokeTx = invokeScript({
            dApp: address(this.e.seeds.amm),
            call: {
                function: "view_calcRemainMarginWithFundingPayment",
                args: [
                    { type: 'string', value: trader }
                ]
            },
        }, this.e.seeds.admin);

        try {
            await broadcast(invokeTx);
        } catch (e) {
            let { message } = JSON.parse(JSON.stringify(e))
            let parts = message.replace('Error while executing account-script: ', '').split(',')
            let margin = Number.parseFloat((parseInt(parts[0]) / 10**6).toFixed(4))
            let fundingPayment = Number.parseFloat((parseInt(parts[1]) / 10**6).toFixed(4))
            let marginRatio = Number.parseFloat((parseInt(parts[2]) / 10**6).toFixed(4))
            let unrealizedPnl = Number.parseFloat((parseInt(parts[3]) / 10**6).toFixed(4))
            let badDebt = Number.parseFloat((parseInt(parts[4]) / 10**6).toFixed(4))

            return {
                margin,
                fundingPayment,
                marginRatio,
                unrealizedPnl,
                badDebt
            }
        }
    }
}

class Insurance {

    constructor(e) {
        this.e = e
    }

    async deposit(_amount) {
        let amount = _amount * decimals
        await this.e.supplyUsdn(_amount, address(this.e.seeds.admin))

        let tx = await invoke({
            dApp: address(this.e.seeds.insurance),
            functionName: "deposit",
            payment: { amount, assetId: this.e.assets.neutrino }
        }, this.e.seeds.admin)

        await waitForTx(tx.id)
        return tx
    }

    async getBalance() {
        let dApp = address(this.e.seeds.insurance)
        let balance = await accountDataByKey(`k_insurance`, dApp).then(x => x.value)

        return Number.parseFloat((balance / 10**6).toFixed(4))
    }
}

class Miner {

    constructor(e, sender) {
        this.e = e
        this.sender = sender
    }

    as(_sender) {
        return new Miner(this.e, _sender)
    }

    async notifyFees(_trader, _fee) {
        let fee = _fee * decimals
        let tx = await invoke({
            dApp: address(this.e.seeds.miner),
            functionName: "notifyFees",
            arguments: [_trader, fee]
        }, this.sender)

        await waitForTx(tx.id)
        return tx
    }

    async notifyNotional(_trader, _notional) {
        let notional = _notional * decimals
        let tx = await invoke({
            dApp: address(this.e.seeds.miner),
            functionName: "notifyNotional",
            arguments: [_trader, notional]
        }, this.sender)

        await waitForTx(tx.id)
        return tx
    } 

    async attachRewardAsset(_assetId, _maxAmountPerPeriod) {
        let maxAmountPerPeriod = _maxAmountPerPeriod * wvs
        let tx = await invoke({
            dApp: address(this.e.seeds.miner),
            functionName: "attachRewardAsset",
            arguments: [_assetId, maxAmountPerPeriod]
        }, this.e.seeds.admin)

        await waitForTx(tx.id)
        return tx
    }

    async attachRewards(_amm, _assetId, _rewardRate) {
        let rewardRate = _rewardRate * wvs
        let tx = await invoke({
            dApp: address(this.e.seeds.miner),
            functionName: "attachRewards",
            arguments: [address(_amm), _assetId, rewardRate]
        }, this.e.seeds.admin)

        await waitForTx(tx.id)
        return tx
    }

    async claimAllRewards(_assetId, _period) {
        let tx = await invoke({
            dApp: address(this.e.seeds.miner),
            functionName: "claimAllRewards",
            arguments: [_assetId, `${_period}`]
        }, this.sender)

        await waitForTx(tx.id)
        return tx
    }

    async getTraderFeeInPeriod(_amm, _trader, _period) {
        let amm = address(_amm)
        let dApp = address(this.e.seeds.miner)
        let value = await accountDataByKey(`k_traderFeesInPeriod_${amm}_${_trader}_${_period}`, dApp).then(x => x.value)
        return value
    }

    async getAmmFeeInPeriod(_amm, _period) {
        let amm = address(_amm)
        let dApp = address(this.e.seeds.miner)
        let value = await accountDataByKey(`k_totalFeesInPeriod_${amm}_${_period}`, dApp).then(x => x.value)
        return value
    }

    async getAssetFeeInPeriod(_assetId, _period) {
        let dApp = address(this.e.seeds.miner)
        let value = await accountDataByKey(`k_totalAssetFeesInPeriod_${_assetId}_${_period}`, dApp).then(x => x.value)
        return value
    }

    async getTraderNotionalInPeriod(_amm, _trader, _period) {
        let amm = address(_amm)
        let dApp = address(this.e.seeds.miner)
        let value = await accountDataByKey(`k_traderAverageNotionalInPeriod_${amm}_${_trader}_${_period}`, dApp).then(x => x.value)
        return value
    }

    async getTraderScoreInPeriod(_amm, _trader, _period) {
        let amm = address(_amm)
        let dApp = address(this.e.seeds.miner)
        let value = await accountDataByKey(`k_traderScoreInPeriod_${amm}_${_trader}_${_period}`, dApp).then(x => x.value)
        return value
    }

    async getAmmScoreInPeriod(_amm, _period) {
        let amm = address(_amm)
        let dApp = address(this.e.seeds.miner)
        let value = await accountDataByKey(`k_totalScoreInPeriod_${amm}_${_period}`, dApp).then(x => x.value)
        return value
    }

    async getPeriod() {
        const invokeTx = invokeScript({
            dApp: address(this.e.seeds.miner),
            call: {
                function: "view_getPeriod",
                args: []
            },
        }, this.e.seeds.admin);

        try {
            await broadcast(invokeTx);
        } catch (e) {
            let { message } = JSON.parse(JSON.stringify(e))
            let parts = message.replace('Error while executing account-script: ', '').split(',')
            let weekStart = parseInt(parts[0])
            let weekEnd = parseInt(parts[1])
            let timestamp = parseInt(parts[2])

            return {
                weekStart,
                weekEnd,
                timestamp
            }
        }
    }

    async getTraderRewardInPeriod(_assetId, _trader, _period) {
        const invokeTx = invokeScript({
            dApp: address(this.e.seeds.miner),
            call: {
                function: "view_claimAllRewards",
                args: [
                    {
                        type: "string",
                        value: _trader
                    },
                    {
                        type: "string",
                        value: _assetId
                    },
                    {
                        type: "string",
                        value: `${_period}`
                    }
                ]
            },
        }, this.e.seeds.admin);

        try {
            await broadcast(invokeTx);
        } catch (e) {
            let { message } = JSON.parse(JSON.stringify(e))
            let parts = message.replace('Error while executing account-script: ', '').split(',')
            let rewards = parseInt(parts[0])
            let claimed = parseInt(parts[1])

            return {
                rewards,
                claimed
            }
        }
    }

    async getMaxAmountOfAssetToDistribute(_amm, _assetId, _period) {
        const invokeTx = invokeScript({
            dApp: address(this.e.seeds.miner),
            call: {
                function: "view_getMaxAmountOfAssetToDistribute",
                args: [
                    {
                        type: "string",
                        value: address(_amm)
                    },
                    {
                        type: "string",
                        value: _assetId
                    },
                    {
                        type: "integer",
                        value: _period
                    }
                ]
            },
        }, this.e.seeds.admin);

        try {
            await broadcast(invokeTx);
        } catch (e) {
            let { message } = JSON.parse(JSON.stringify(e))
            let parts = message.replace('Error while executing account-script: ', '').split(',')
            let amount = parseInt(parts[0])

            return amount
        }
    }
}

module.exports = {
    Environment
}