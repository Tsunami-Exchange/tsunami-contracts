chai.config.includeStack = true

const wvs = 10 ** 8;
const decimals = 10 ** 6;

const tsn = "GSm9yGjTcc1FxqkuBXFuhMoFGSMCzdDPunEcEZvkM9hJ"
const neutrino = "HezsdQuRDtzksAYUy97gfhKy7Z1NW2uXYSHA3bgqenNZ"
const neutrinoStaking = "3N9LkJahTMx41wGhSxLS42prCZtRCp4dhTs"

const SEED_USDN_HOLDER = "inspire slam drum produce flee force fee false sunset give kidney illegal leave gallery story"

async function stateChangesMap(txId) {
    const index = {}
    const changeList = await stateChanges(txId)
    changeList.data.forEach(e => {
        index[e.key] = e.value
    })
    return index
}

async function getPositionActualMargin(trader) {
     const invokeTx = invokeScript({
        dApp: address(accounts.wallet),
        call: {
            function: "view_calcRemainMarginWithFundingPayment",
            args: [
                { type: 'string', value: trader }
            ]
        },
    }, accounts.admin);

    try {
        await broadcast(invokeTx);
    } catch (e) {
        let { message } = JSON.parse(JSON.stringify(e))
        let parts = message.replace('Error while executing account-script: ', '').split(',')
        let margin = parseInt(parts[0])
        let marginRatio = parseInt(parts[2])
        console.log(`fundingPayment=${parseInt(parts[1])}`)
        console.log(`marginRatio=${marginRatio}`)
        return margin
    }
}

describe('vAMM should work with positive funding', async function () {

    this.timeout(600000);

    const deploy = async (filename, fee, seed, name) => {
        const code = file(filename)
        const script = compile(code)
        const tx = setScript({ script, fee}, seed);
        await broadcast(tx);
        await waitForTx(tx.id)
        console.log(`${name} deployed to ${address(seed)} in ${tx.id}`)
    }

    before(async function () {
        await setupAccounts({
            admin: 0.1 * wvs,
            wallet: 0.05 * wvs,
            coordinator: 0.05 * wvs,
            shorter: 0.05 * wvs,
            insurance: 0.05 * wvs,
            staking: 0.05 * wvs,
            longer: 0.05 * wvs,
            oracle: 0.01 * wvs,
            miner: 0.05 * wvs
        });

        console.log(`Admin address is ${address(accounts.admin)}, public key is ${publicKey(accounts.admin)}`)
        console.log(`USDN Donor address is ${address(SEED_USDN_HOLDER)} balance is ${(Math.round((await assetBalance(neutrino, address(SEED_USDN_HOLDER)))) / decimals)}`)

        let p1 = deploy('coordinator.ride' , 3400000, accounts.coordinator , 'Coordinator')
        let p2 = deploy('insurance.ride'   , 3400000, accounts.insurance   , 'Insurance Fund')
        let p3 = deploy('vAMM2.ride'       , 4700000, accounts.wallet      , 'vAMM')
        let p4 = deploy('mining.ride'      , 3400000, accounts.miner       , 'Miner')

        let period = Math.floor((new Date()).getTime() / 1000 / 604800)

        // Set oracle price to 50 USDN / Waves (AMM price is approx 55)
        //
        let seedOracleTx = data({
            data: [
                {
                    "key": "price",
                    "type": "integer",
                    "value": Math.round(50 * decimals)
                },
                {
                    "key": `price_${period}_${tsn}`,
                    "type": "integer",
                    "value": Math.round(4 * decimals)
                }
            ]
        }, accounts.oracle)

        await broadcast(seedOracleTx)
        console.log(`Seed oracle in ${seedOracleTx.id}`)

        await Promise.all([p1, p2, p3, p4, seedOracleTx])
        // Init coordinator
        {
            console.log(`Setting admin...`)
            const addAdminTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "setAdmin",
                arguments: [ publicKey(accounts.admin) ],
            }, accounts.admin)

            console.log(`setAdmin in ${addAdminTx.id}`)
            await waitForTx(addAdminTx.id)

            const setInsuranceFundTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "setInsuranceFund",
                arguments: [ address(accounts.insurance) ]
            }, accounts.admin)

            console.log(`setInsuranceFund in ${setInsuranceFundTx.id}`)

            const setMinerTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "setLiquidityMiner",
                arguments: [ address(accounts.miner) ]
            }, accounts.admin)

            console.log(`setLiquidityMiner in ${setMinerTx.id}`)
            
            const setQuoteAssetTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "setQuoteAsset",
                arguments: [ neutrino, neutrinoStaking ]
            }, accounts.admin)

            console.log(`setQuoteAsset in ${setQuoteAssetTx.id}`)

            const setStakingAddressTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "setStakingAddress",
                arguments: [ address(accounts.staking) ]
            }, accounts.admin)

            console.log(`setStakingAddress in ${setStakingAddressTx.id}`)

            const addAmmTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "addAmm",
                arguments: [ address(accounts.wallet), "" ]
            }, accounts.admin)

            console.log(`addAmm in ${addAmmTx.id}`)

            await waitForTx(setInsuranceFundTx.id)
            await waitForTx(setQuoteAssetTx.id)
            await waitForTx(setStakingAddressTx.id)
            await waitForTx(addAmmTx.id)
            await waitForTx(setMinerTx.id)
        }
        
        // Init AMM
        {
            const initTx = invokeScript({
                dApp: address(accounts.wallet),
                call: {
                    function: "initialize",
                    args: [
                        { type: 'integer', value: 100000 * decimals },   // _quouteAssetReserve
                        { type: 'integer', value: 1818   * decimals },   // _baseAssetReserve ~ 55 USDN / Waves (Optimistic!)
                        { type: 'integer', value: 60 },                  // _fundingPeriod = 1 minute
                        { type: 'integer', value: 0.05  * decimals },    // _initMarginRatio = 5%
                        { type: 'integer', value: 0.085 * decimals },    // _maintenanceMarginRatio = 10%
                        { type: 'integer', value: 0.05  * decimals },    // _liquidationFeeRatio = 5%
                        { type: 'integer', value: 0.01  * decimals },    // _fee 1%
                        { type: 'string' , value: address(accounts.oracle) },    // Oracle address
                        { type: 'string' , value: 'price' },                                  // Oracle key
                        { type: 'string' , value: address(accounts.coordinator) },            // Coordinator address,
                        { type: 'integer', value: 0.1   * decimals },    // _spreadLimit 10%
                        { type: 'integer', value: 0.08  * decimals },    // _maxPriceImpact 8%
                    ]
                },
            }, accounts.admin);

            await broadcast(initTx);
            await waitForTx(initTx.id)
        
            console.log('vAMM initialized in ' + initTx.id)
        }

        // Init insurarance
        {
            const initInsuranceTx = await invoke({
                dApp: address(accounts.insurance),
                functionName: "initialize",
                arguments: [ address(accounts.coordinator) ]
            }, accounts.admin)

            await waitForTx(initInsuranceTx.id)
            console.log('Insurance initialized in ' + initInsuranceTx.id)
        }

        // Init miner
        {
            const initMinerTx = await invoke({
                dApp: address(accounts.miner),
                functionName: "initialize",
                arguments: [ address(accounts.coordinator), address(accounts.oracle) ]
            }, accounts.admin)

            await waitForTx(initMinerTx.id)
            console.log('Miner initialized in ' + initMinerTx.id)
        }
        
        // Fund shorter account
        {
            const fundShorterTx = transfer({
                assetId: neutrino,
                amount: 5 * decimals,
                recipient: address(accounts.shorter)
            }, SEED_USDN_HOLDER)

            await broadcast(fundShorterTx);
            await waitForTx(fundShorterTx.id);

            console.log('Shorter funded by: ' + fundShorterTx.id)
        }

        // Fund longer account
        {
            const fundLongerTx = transfer({
                assetId: neutrino,
                amount: 20 * decimals,
                recipient: address(accounts.longer)
            }, SEED_USDN_HOLDER)

            await broadcast(fundLongerTx);
            await waitForTx(fundLongerTx.id);

            console.log('Longer funded by: ' + fundLongerTx.id)
        }
    });

    it.skip('Can add insurance funds', async function () {
        const fundAdminTx = transfer({
            assetId: neutrino,
            amount: 1 * decimals,
            recipient: address(accounts.admin)
        }, SEED_USDN_HOLDER)

        await broadcast(fundAdminTx);
        await waitForTx(fundAdminTx.id);

        const addInsuranceFundsTx = invokeScript({
            dApp: address(accounts.insurance),
            call: {
                function: "deposit"
            },
            payment: [
                {
                    amount: 1 * decimals,
                    assetId: neutrino
                }
            ]
        }, accounts.admin)

        await broadcast(addInsuranceFundsTx);
        await waitForTx(addInsuranceFundsTx.id);

        console.log('Added insurance funds by ' + addInsuranceFundsTx.id)
    })

    it('Can open position', async function () {
        const openPositionTx = invokeScript({
            dApp: address(accounts.wallet),
            call: {
                   function: "increasePosition",
                args: [
                    { type: 'integer', value: 1 }, // _direction = LONG
                    { type: 'integer', value: 3 * decimals }, // _leverage = 3
                    { type: 'integer', value: 0.15 * decimals }, // _minBaseAssetAmount = 0.1 WAVES
                ]
            },
            payment: [
                {
                    amount: 10 * decimals,
                    assetId: neutrino
                }
            ]
        }, accounts.longer)

        await broadcast(openPositionTx);
        await waitForTx(openPositionTx.id);

        console.log('Position opened by ' + openPositionTx.id)

        let changes = await stateChangesMap(openPositionTx.id)
        
        /*
        expect(changes[`k_positionSize_${address(accounts.longer)}`]).to.be.eq(539786)
        expect(changes[`k_positionMargin_${address(accounts.longer)}`]).to.be.eq(9900000) // 10 USDN - 1%
        expect(changes[`k_positionOpenNotional_${address(accounts.longer)}`]).to.be.eq(29700000) // 9900000 * 3
        
        expect(changes[`k_totalPositionSize`]).to.be.eq(539786)
        expect(changes[`k_totalLongPositionSize`]).to.be.eq(539786)
        expect(changes[`k_totalShortPositionSize`]).to.be.eq(0)
        */

        console.log(`Just opened long`)
        try {
            await getPositionActualMargin(address(accounts.shorter))
        } catch (e) {
            
        }
    })

    it('Can increase position', async function () {
        const openPositionTx = invokeScript({
            dApp: address(accounts.wallet),
            call: {
                function: "increasePosition",
                args: [
                    { type: 'integer', value: 1 }, // _direction = LONG
                    { type: 'integer', value: 3 * decimals }, // _leverage = 3
                    { type: 'integer', value: 0.15 * decimals }, // _minBaseAssetAmount = 0.1 WAVES
                ]
            },
            payment: [
                {
                    amount: 5 * decimals,
                    assetId: neutrino
                }
            ]
        }, accounts.longer)

        await broadcast(openPositionTx);
        await waitForTx(openPositionTx.id);

        console.log('Position increased by ' + openPositionTx.id)

        let changes = await stateChangesMap(openPositionTx.id)

        expect(changes[`k_positionSize_${address(accounts.longer)}`]).to.be.eq(809559)
        expect(changes[`k_positionMargin_${address(accounts.longer)}`]).to.be.eq(14850000) // 10 USDN - 1% + 5 USDN - 1%
        expect(changes[`k_positionOpenNotional_${address(accounts.longer)}`]).to.be.eq(44550000) // 14850000 * 3
        
        expect(changes[`k_totalPositionSize`]).to.be.eq(809559)
        expect(changes[`k_totalLongPositionSize`]).to.be.eq(809559)
        expect(changes[`k_totalShortPositionSize`]).to.be.eq(0)
    })

    it.only('Can add remove liquidity', async function () {
        const addLiquidityTx = invokeScript({
            dApp: address(accounts.wallet),
            call: {
                function: "addLiquidity",
                args: [
                    { type: 'integer', value: 50000 * decimals }, // add 50k USDN liquidity
                ]
            }
        }, accounts.admin)

        await broadcast(addLiquidityTx);
        await waitForTx(addLiquidityTx.id);

        console.log('Liquidity increased by ' + addLiquidityTx.id)

        const removeLiquidityTx = invokeScript({
            dApp: address(accounts.wallet),
            call: {
                function: "removeLiquidity",
                args: [
                    { type: 'integer', value: 50000 * decimals }, // remove 50k USDN liquidity
                ]
            }
        }, accounts.admin)

        await broadcast(removeLiquidityTx);
        await waitForTx(removeLiquidityTx.id);

        console.log('Liquidity decreased by ' + removeLiquidityTx.id)
    })

    it('Can decrease position', async function () {
        const decreasePositionTx = invokeScript({
            dApp: address(accounts.wallet),
            call: {
                function: "decreasePosition",
                args: [
                    { type: 'integer', value: 3 * decimals }, // _amount = 3
                    { type: 'integer', value: 3 * decimals }, // _leverage = 3
                    { type: 'integer', value: 0.15 * decimals }, // _minBaseAssetAmount = 0.1 WAVES
                ]
            }
        }, accounts.longer)

        await broadcast(decreasePositionTx);
        await waitForTx(decreasePositionTx.id);

        console.log('Position decreased by ' + decreasePositionTx.id)

        let changes = await stateChangesMap(decreasePositionTx.id)

        expect(changes[`k_positionSize_${address(accounts.longer)}`]).to.be.eq(646070)
        expect(changes[`k_positionMargin_${address(accounts.longer)}`]).to.be.eq(14850007) // Margin stays the same (a bit more due to partially realized p/l)
        expect(changes[`k_positionOpenNotional_${address(accounts.longer)}`]).to.be.eq(35550007) // Notional is decreased
        
        expect(changes[`k_totalPositionSize`]).to.be.eq(646070)
        expect(changes[`k_totalLongPositionSize`]).to.be.eq(646070)
        expect(changes[`k_totalShortPositionSize`]).to.be.eq(0)
    })

    it('Can add margin', async function () {
        const addMarginTx = invokeScript({
            dApp: address(accounts.wallet),
            call: {
                function: "addMargin",
                args: [],
            },
            payment: [
                {
                    amount: 3 * decimals,
                    assetId: neutrino
                }
            ]
        }, accounts.longer)

        await broadcast(addMarginTx);
        await waitForTx(addMarginTx.id);

        console.log('Added position margin in: ' + addMarginTx.id)

        let changes = await stateChangesMap(addMarginTx.id)

        expect(changes[`k_positionSize_${address(accounts.longer)}`]).to.be.eq(646070) // Do not change size
        expect(changes[`k_positionMargin_${address(accounts.longer)}`]).to.be.eq(17820007) // Add 3 USDN - 1% to margin
        expect(changes[`k_positionOpenNotional_${address(accounts.longer)}`]).to.be.eq(35550007) // Notional unchanged
    })

    it('Can remove margin', async function () {
        const removeMarginTx = invokeScript({
            dApp: address(accounts.wallet),
            call: {
                function: "removeMargin",
                args: [
                    { type: 'integer', value: 2 * decimals }
                ],
            }
        }, accounts.longer)

        await broadcast(removeMarginTx);
        await waitForTx(removeMarginTx.id);

        console.log('Removed position margin in: ' + removeMarginTx.id)

        let changes = await stateChangesMap(removeMarginTx.id)

        expect(changes[`k_positionSize_${address(accounts.longer)}`]).to.be.eq(646070) // Do not change size
        expect(changes[`k_positionMargin_${address(accounts.longer)}`]).to.be.eq(15820007) // Add 3 USDN - 1% to margin
        expect(changes[`k_positionOpenNotional_${address(accounts.longer)}`]).to.be.eq(35550007) // Notional unchanged
    })

    it('Can not remove too much margin', async function () {
        const removeMarginTx = invokeScript({
            dApp: address(accounts.wallet),
            call: {
                function: "removeMargin",
                args: [
                    { type: 'integer', value: 110 * decimals }
                ],
            }
        }, accounts.longer)

        let failed = false
        try {
            await broadcast(removeMarginTx);
        } catch (e) {
            failed = true
        }
        if (!failed) {
            expect.fail("Should fail")
        }
        
    })

    it('Can open short position', async function () {
        const openPositionTx = invokeScript({
            dApp: address(accounts.wallet),
            call: {
                function: "increasePosition",
                args: [
                    { type: 'integer', value: 2 }, // _direction = SHORT
                    { type: 'integer', value: 3 * decimals }, // _leverage = 3
                    { type: 'integer', value: 0.06 * decimals }, // _minBaseAssetAmount = 0.06 WAVES
                ]
            },
            payment: [
                {
                    amount: 5 * decimals,
                    assetId: neutrino
                }
            ]
        }, accounts.shorter)

        await broadcast(openPositionTx);
        await waitForTx(openPositionTx.id);

        console.log('Position (short) opened by ' + openPositionTx.id)

        let changes = await stateChangesMap(openPositionTx.id)

        /*
        expect(changes[`k_positionSize_${address(accounts.shorter)}`]).to.be.eq(-269821)
        expect(changes[`k_positionMargin_${address(accounts.shorter)}`]).to.be.eq(4950000) // 5 USDN - 1%
        expect(changes[`k_positionOpenNotional_${address(accounts.shorter)}`]).to.be.eq(14850000) // 3 * (5 USDN - 1%) 
        
        expect(changes[`k_totalPositionSize`]).to.be.eq(376249) // 646070 - 269821
        expect(changes[`k_totalLongPositionSize`]).to.be.eq(646070)
        expect(changes[`k_totalShortPositionSize`]).to.be.eq(269821)
        */

        console.log(`Just opened short`)
        try {
            await getPositionActualMargin(address(accounts.shorter))
        } catch (e) {
            
        }

    })

    it('Can decrease short position', async function () {
        const decreasePositionTx = invokeScript({
            dApp: address(accounts.wallet),
            call: {
                function: "decreasePosition",
                args: [
                    { type: 'integer', value: 1 * decimals }, // _amount = 1
                    { type: 'integer', value: 3 * decimals }, // _leverage = 3
                    { type: 'integer', value: 0.04 * decimals }, // _minBaseAssetAmount = 0.06 WAVES
                ]
            }
        }, accounts.shorter)

        await broadcast(decreasePositionTx);
        await waitForTx(decreasePositionTx.id);

        console.log('Position (short) decreased by ' + decreasePositionTx.id)

        let changes = await stateChangesMap(decreasePositionTx.id)

        expect(changes[`k_positionSize_${address(accounts.shorter)}`]).to.be.eq(-215305)
        expect(changes[`k_positionMargin_${address(accounts.shorter)}`]).to.be.eq(4950004) // 5 USDN - 1%
        expect(changes[`k_positionOpenNotional_${address(accounts.shorter)}`]).to.be.eq(11849996) // 3 * (5 USDN - 1%) 
        
        expect(changes[`k_totalPositionSize`]).to.be.eq(430765) // 646070 - 215305
        expect(changes[`k_totalLongPositionSize`]).to.be.eq(646070)
        expect(changes[`k_totalShortPositionSize`]).to.be.eq(215305)
    })

    it('Can pay funding', async function () {
        const quouteAssetReserve = await accountDataByKey("k_quouteAssetReserve", address(accounts.wallet))
        const baseAssetReserve = await accountDataByKey("k_baseAssetReserve", address(accounts.wallet))

        console.log(`quouteAssetReserve=${JSON.stringify(quouteAssetReserve)}`)
        console.log(`baseAssetReserve=${JSON.stringify(baseAssetReserve)}`)
        console.log(`Start waiting 1 block`)

        await waitNBlocks(1, {
            timeout: 1000000
        })

        console.log(`Done waiting 1 block`)

        const longerOldMargin = await getPositionActualMargin(address(accounts.longer))
        const shorterOldMargin = await getPositionActualMargin(address(accounts.shorter))

        const payFundingTx = invokeScript({
            dApp: address(accounts.wallet),
            call: {
                function: "payFunding",
                args: []
            }
        }, accounts.admin)

        await broadcast(payFundingTx);
        console.log('Paid funding tx: ' + payFundingTx.id)
        await waitForTx(payFundingTx.id);

        // Premium is approximately 55 * decimal - 50 * decimal
        // PremiumFraction is premium * 60 / 86400 = ~31250
        // Since index price < mark price we need to push AMM price DOWN
        // to push AMM price DOWN we need to stimulate SHORTS, e.t. long pays SHORT
        // that means that longer will have a penalty of 0.03125 USDN per waves Holding
        // longer have 0.64607 Waves 0.64607 * 0.03125 = 0.020 USDN in funding payment
        // shorter on the other hand should receive 0.020 USDN in funding
        //
        const longerNewMargin = await getPositionActualMargin(address(accounts.longer))
        const shorterNewMargin = await getPositionActualMargin(address(accounts.shorter))

        console.log(JSON.stringify({
            longerOldMargin,
            longerNewMargin,
            shorterOldMargin,
            shorterNewMargin
        }, null, 2))

        // Check that longer balance is less now
        //
        expect(longerNewMargin).to.be.lt((longerOldMargin))
        expect(shorterNewMargin).to.be.gt((shorterOldMargin))

        // Expect same diff
        //
        expect(longerOldMargin - longerNewMargin).to.be.eq(shorterNewMargin - shorterOldMargin)
    })

    it('Can close position', async function () {
        const closePositionTx = invokeScript({
            dApp: address(accounts.wallet),
            call: {
                function: "closePosition"
            }
        }, accounts.longer)

        await broadcast(closePositionTx);
        await waitForTx(closePositionTx.id);

        console.log('Position closed by ' + closePositionTx.id)

        let changes = await stateChangesMap(closePositionTx.id)

        expect(changes[`k_totalPositionSize`]).to.be.eq(-215305) // 0 - 215305
        expect(changes[`k_totalLongPositionSize`]).to.be.eq(0)
        expect(changes[`k_totalShortPositionSize`]).to.be.eq(215305)
    })

    it('Can close short position', async function () {
        const closePositionTx = invokeScript({
            dApp: address(accounts.wallet),
            call: {
                function: "closePosition"
            }
        }, accounts.shorter)

        await broadcast(closePositionTx);
        await waitForTx(closePositionTx.id);

        console.log('Position closed by ' + closePositionTx.id)

        let changes = await stateChangesMap(closePositionTx.id)

        expect(changes[`k_totalPositionSize`]).to.be.eq(0) 
        expect(changes[`k_totalLongPositionSize`]).to.be.eq(0)
        expect(changes[`k_totalShortPositionSize`]).to.be.eq(0)
    })
})

describe('vAMM should be able to liquidate underwater position', async function () {

    this.timeout(600000);

    const deploy = async (filename, fee, seed, name) => {
        const code = file(filename)
        const script = compile(code)
        const tx = setScript({ script, fee}, seed);
        await broadcast(tx);
        await waitForTx(tx.id)
        console.log(`${name} deployed to ${address(seed)} in ${tx.id}`)
    }

    before(async function () {
        await setupAccounts({
            admin: 0.05 * wvs,
            wallet: 0.05 * wvs,
            coordinator: 0.05 * wvs,
            shorter: 0.05 * wvs,
            insurance: 0.05 * wvs,
            staking: 0.05 * wvs,
            longer: 0.05 * wvs,
            oracle: 0.01 * wvs
        });

        console.log(`Admin address is ${address(accounts.admin)}, public key is ${publicKey(accounts.admin)}`)
        console.log(`USDN Donor address is ${address(SEED_USDN_HOLDER)} balance is ${(Math.round((await assetBalance(neutrino, address(SEED_USDN_HOLDER)))) / decimals)}`)

        let p1 = deploy('coordinator.ride' , 3400000, accounts.coordinator , 'Coordinator')
        let p2 = deploy('insurance.ride'   , 3400000, accounts.insurance   , 'Insurance Fund')
        let p3 = deploy('vAMM2.ride'       , 4700000, accounts.wallet      , 'vAMM')

        let period = Math.floor((new Date()).getTime() / 1000 / 604800)

        // Set oracle price to 50 USDN / Waves (AMM price is approx 55)
        //
        let seedOracleTx = data({
            data: [
                {
                    "key": "price",
                    "type": "integer",
                    "value": Math.round(28 * decimals)
                },
                {
                    "key": `price_${period}_${neutrino}`,
                    "type": "integer",
                    "value": Math.round(28 * decimals)
                },

            ]
        }, accounts.oracle)

        await broadcast(seedOracleTx)
        console.log(`Seed oracle in ${seedOracleTx.id}`)

        await Promise.all([p1, p2, p3, seedOracleTx])
        // Init coordinator
        {
            console.log(`Setting admin...`)
            const addAdminTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "setAdmin",
                arguments: [ publicKey(accounts.admin) ],
            }, accounts.admin)

            console.log(`setAdmin in ${addAdminTx.id}`)
            await waitForTx(addAdminTx.id)

            const setInsuranceFundTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "setInsuranceFund",
                arguments: [ address(accounts.insurance) ]
            }, accounts.admin)

            console.log(`setInsuranceFund in ${setInsuranceFundTx.id}`)
            
            const setQuoteAssetTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "setQuoteAsset",
                arguments: [ neutrino, neutrinoStaking ]
            }, accounts.admin)

            console.log(`setQuoteAsset in ${setQuoteAssetTx.id}`)

            const setStakingAddressTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "setStakingAddress",
                arguments: [ address(accounts.staking) ]
            }, accounts.admin)

            console.log(`setStakingAddress in ${setStakingAddressTx.id}`)

            const addAmmTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "addAmm",
                arguments: [ address(accounts.wallet), "" ]
            }, accounts.admin)

            console.log(`addAmm in ${addAmmTx.id}`)

            await waitForTx(setInsuranceFundTx.id)
            await waitForTx(setQuoteAssetTx.id)
            await waitForTx(setStakingAddressTx.id)
            await waitForTx(addAmmTx.id)
        }
        
        // Init AMM
        {
            const initTx = invokeScript({
                dApp: address(accounts.wallet),
                call: {
                    function: "initialize",
                    args: [
                        { type: 'integer', value: 100 * decimals },      // _quouteAssetReserve
                        { type: 'integer', value: 1.818  * decimals },   // _baseAssetReserve
                        { type: 'integer', value: 60 },                  // _fundingPeriod = 1 minute
                        { type: 'integer', value: 0.05  * decimals },    // _initMarginRatio = 5%
                        { type: 'integer', value: 0.085 * decimals },    // _maintenanceMarginRatio = 10%
                        { type: 'integer', value: 0.05  * decimals },    // _liquidationFeeRatio = 5%
                        { type: 'integer', value: 0.01  * decimals },    // _fee 1%
                        { type: 'string' , value: address(accounts.oracle) },    // Oracle address
                        { type: 'string' , value: 'price' },                                  // Oracle key
                        { type: 'string' , value: address(accounts.coordinator) },            // Coordinator address,
                        { type: 'integer', value: 0.1   * decimals },    // _spreadLimit 10%
                        { type: 'integer', value: 0.08  * decimals },    // _maxPriceImpact 8%
                    ]
                },
            }, accounts.admin);

            await broadcast(initTx);
            await waitForTx(initTx.id)
        
            console.log('vAMM initialized in ' + initTx.id)
        }

        // Init insurarance
        {
            const initInsuranceTx = await invoke({
                dApp: address(accounts.insurance),
                functionName: "initialize",
                arguments: [ address(accounts.coordinator) ]
            }, accounts.admin)

            await waitForTx(initInsuranceTx.id)
            console.log('Insurance initialized in ' + initInsuranceTx.id)
        }
        
        // Fund shorter account
        {
            const fundShorterTx = transfer({
                assetId: neutrino,
                amount: 10 * decimals,
                recipient: address(accounts.shorter)
            }, SEED_USDN_HOLDER)

            await broadcast(fundShorterTx);
            await waitForTx(fundShorterTx.id);

            console.log('Shorter funded by: ' + fundShorterTx.id)
        }

        // Fund longer account
        {
            const fundLongerTx = transfer({
                assetId: neutrino,
                amount: 20 * decimals,
                recipient: address(accounts.longer)
            }, SEED_USDN_HOLDER)

            await broadcast(fundLongerTx);
            await waitForTx(fundLongerTx.id);

            console.log('Longer funded by: ' + fundLongerTx.id)
        }
    });

    it('Can add insurance funds', async function () {
        const fundAdminTx = transfer({
            assetId: neutrino,
            amount: 1 * decimals,
            recipient: address(accounts.admin)
        }, SEED_USDN_HOLDER)

        await broadcast(fundAdminTx);
        await waitForTx(fundAdminTx.id);

        const addInsuranceFundsTx = invokeScript({
            dApp: address(accounts.insurance),
            call: {
                function: "deposit"
            },
            payment: [
                {
                    amount: 1 * decimals,
                    assetId: neutrino
                }
            ]
        }, accounts.admin)

        await broadcast(addInsuranceFundsTx);
        await waitForTx(addInsuranceFundsTx.id);

        console.log('Added insurance funds by ' + addInsuranceFundsTx.id)
    })

    it('Can open position', async function () {
        const openPositionTx = invokeScript({
            dApp: address(accounts.wallet),
            call: {
                function: "increasePosition",
                args: [
                    { type: 'integer', value: 1 }, // _direction = LONG
                    { type: 'integer', value: 3 * decimals }, // _leverage = 3
                    { type: 'integer', value: 0.015 * decimals }, // _minBaseAssetAmount = 0.1 WAVES
                ]
            },
            payment: [
                {
                    amount: 0.5 * decimals,
                    assetId: neutrino
                }
            ]
        }, accounts.longer)

        await broadcast(openPositionTx);
        await waitForTx(openPositionTx.id);

        console.log('Position opened by ' + openPositionTx.id)
    })

    it('Can open short position', async function () {
        const openPositionTx = invokeScript({
            dApp: address(accounts.wallet),
            call: {
                function: "increasePosition",
                args: [
                    { type: 'integer', value: 2 }, // _direction = SHORT
                    { type: 'integer', value: 3 * decimals }, // _leverage = 10
                    { type: 'integer', value: 0.15 * decimals }, // _minBaseAssetAmount = 0.1 WAVES
                ]
            },
            payment: [
                {
                    amount: 10 * decimals,
                    assetId: neutrino
                }
            ]
        }, accounts.shorter)

        await broadcast(openPositionTx);
        await waitForTx(openPositionTx.id);

        console.log('Short position opened by ' + openPositionTx.id)
    })

    it('Can liquidate position', async function () {
        const liquidatePositionTx = invokeScript({
            dApp: address(accounts.wallet),
            call: {
                function: "liquidate",
                args: [
                    { type: 'string', value: address(accounts.longer) }
                ]
            }
        }, accounts.shorter)

        console.log('Position liquidated by ' + liquidatePositionTx.id)

        await broadcast(liquidatePositionTx);   
        await waitForTx(liquidatePositionTx.id);
    })

    it('Can close short position', async function () {
        const closePositionTx = invokeScript({
            dApp: address(accounts.wallet),
            call: {
                function: "closePosition"
            }
        }, accounts.shorter)

        await broadcast(closePositionTx);
        await waitForTx(closePositionTx.id);

        console.log('Position closed by ' + closePositionTx.id)
    })
})

describe('Should update price multuple time per minute', async function () {

    this.timeout(6000000);

    const deploy = async (filename, fee, seed, name) => {
        const code = file(filename)
        const script = compile(code)
        const tx = setScript({ script, fee}, seed);
        await broadcast(tx);
        await waitForTx(tx.id)
        console.log(`${name} deployed to ${address(seed)} in ${tx.id}`)
    }

    before(async function () {
        await setupAccounts({
            admin: 0.05 * wvs,
            wallet: 0.05 * wvs,
            coordinator: 0.05 * wvs,
            shorter: 0.05 * wvs,
            insurance: 0.05 * wvs,
            staking: 0.05 * wvs,
            longer: 0.11 * wvs,
            oracle: 0.01 * wvs
        });

        console.log(`Admin address is ${address(accounts.admin)}, public key is ${publicKey(accounts.admin)}`)
        console.log(`USDN Donor address is ${address(SEED_USDN_HOLDER)} balance is ${(Math.round((await assetBalance(neutrino, address(SEED_USDN_HOLDER)))) / decimals)}`)

        let p1 = deploy('coordinator.ride' , 3400000, accounts.coordinator , 'Coordinator')
        let p2 = deploy('insurance.ride'   , 3400000, accounts.insurance   , 'Insurance Fund')
        let p3 = deploy('vAMM2.ride'       , 4700000, accounts.wallet      , 'vAMM')

        // Set oracle price to 50 USDN / Waves (AMM price is approx 55)
        //
        let seedOracleTx = data({
            data: [
                {
                    "key": "price",
                    "type": "integer",
                    "value": Math.round(28 * decimals)
                }
            ]
        }, accounts.oracle)

        await broadcast(seedOracleTx)
        console.log(`Seed oracle in ${seedOracleTx.id}`)

        await Promise.all([p1, p2, p3, seedOracleTx])
        // Init coordinator
        {
            console.log(`Setting admin...`)
            const addAdminTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "setAdmin",
                arguments: [ publicKey(accounts.admin) ],
            }, accounts.admin)

            console.log(`setAdmin in ${addAdminTx.id}`)
            await waitForTx(addAdminTx.id)

            const setInsuranceFundTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "setInsuranceFund",
                arguments: [ address(accounts.insurance) ]
            }, accounts.admin)

            console.log(`setInsuranceFund in ${setInsuranceFundTx.id}`)
            
            const setQuoteAssetTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "setQuoteAsset",
                arguments: [ neutrino, neutrinoStaking ]
            }, accounts.admin)

            console.log(`setQuoteAsset in ${setQuoteAssetTx.id}`)

            const setStakingAddressTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "setStakingAddress",
                arguments: [ address(accounts.staking) ]
            }, accounts.admin)

            console.log(`setStakingAddress in ${setStakingAddressTx.id}`)

            const addAmmTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "addAmm",
                arguments: [ address(accounts.wallet), "" ]
            }, accounts.admin)

            console.log(`addAmm in ${addAmmTx.id}`)

            await waitForTx(setInsuranceFundTx.id)
            await waitForTx(setQuoteAssetTx.id)
            await waitForTx(setStakingAddressTx.id)
            await waitForTx(addAmmTx.id)
        }
        
        // Init AMM
        {
            const initTx = invokeScript({
                dApp: address(accounts.wallet),
                call: {
                    function: "initialize",
                    args: [
                        { type: 'integer', value: 100 * decimals },      // _quouteAssetReserve
                        { type: 'integer', value: 1.818  * decimals },   // _baseAssetReserve
                        { type: 'integer', value: 60 },                  // _fundingPeriod = 1 minute
                        { type: 'integer', value: 0.05  * decimals },    // _initMarginRatio = 5%
                        { type: 'integer', value: 0.085 * decimals },    // _maintenanceMarginRatio = 10%
                        { type: 'integer', value: 0.05  * decimals },    // _liquidationFeeRatio = 5%
                        { type: 'integer', value: 0.01  * decimals },    // _fee 1%
                        { type: 'string' , value: address(accounts.oracle) },    // Oracle address
                        { type: 'string' , value: 'price' },                                  // Oracle key
                        { type: 'string' , value: address(accounts.coordinator) },            // Coordinator address,
                        { type: 'integer', value: 0.1   * decimals },    // _spreadLimit 10%
                        { type: 'integer', value: 0.08  * decimals },    // _maxPriceImpact 8%
                    ]
                },
            }, accounts.admin);

            await broadcast(initTx);
            await waitForTx(initTx.id)
        
            console.log('vAMM initialized in ' + initTx.id)
        }

        // Init insurarance
        {
            const initInsuranceTx = await invoke({
                dApp: address(accounts.insurance),
                functionName: "initialize",
                arguments: [ address(accounts.coordinator) ]
            }, accounts.admin)

            await waitForTx(initInsuranceTx.id)
            console.log('Insurance initialized in ' + initInsuranceTx.id)
        }

        // Fund longer account
        {
            const fundLongerTx = transfer({
                assetId: neutrino,
                amount: 20 * decimals,
                recipient: address(accounts.longer)
            }, SEED_USDN_HOLDER)

            await broadcast(fundLongerTx);
            await waitForTx(fundLongerTx.id);

            console.log('Longer funded by: ' + fundLongerTx.id)
        }
    });


    it('Can open position', async function () {
        let txs = []
        for (let i = 0; i < 20; i++) {
            const openPositionTx = invokeScript({
                dApp: address(accounts.wallet),
                call: {
                    function: "increasePosition",
                    args: [
                        { type: 'integer', value: 1 }, // _direction = LONG
                        { type: 'integer', value: 3 * decimals }, // _leverage = 3
                        { type: 'integer', value: 0.000015 * decimals }, // _minBaseAssetAmount = 0.1 WAVES
                    ]
                },
                payment: [
                    {
                        amount: 0.01 * decimals,
                        assetId: neutrino
                    }
                ]
            }, accounts.longer)

            await broadcast(openPositionTx);
            txs.push(waitForTx(openPositionTx.id))

            console.log('Position opened by ' + openPositionTx.id)
        }

        await Promise.all(txs)

        let dataStr = await accountDataByKey("k_lastDataStr", address(accounts.wallet))
        //let data = dataStr.split(",")

        console.log('data: ' + JSON.stringify(dataStr))

        await waitNBlocks(1)
        txs = []

        for (let i = 0; i < 20; i++) {
            const openPositionTx = invokeScript({
                dApp: address(accounts.wallet),
                call: {
                    function: "increasePosition",
                    args: [
                        { type: 'integer', value: 1 }, // _direction = LONG
                        { type: 'integer', value: 3 * decimals }, // _leverage = 3
                        { type: 'integer', value: 0.000015 * decimals }, // _minBaseAssetAmount = 0.1 WAVES
                    ]
                },
                payment: [
                    {
                        amount: 0.01 * decimals,
                        assetId: neutrino
                    }
                ]
            }, accounts.longer)

            await broadcast(openPositionTx);
            txs.push(waitForTx(openPositionTx.id))

            console.log('Position opened by ' + openPositionTx.id)
        }      

        await Promise.all(txs)  
    })
})

describe('Should correctly increase and decrease positions', async function () {

    this.timeout(6000000);

    const deploy = async (filename, fee, seed, name) => {
        const code = file(filename)
        const script = compile(code)
        const tx = setScript({ script, fee}, seed);
        await broadcast(tx);
        await waitForTx(tx.id)
        console.log(`${name} deployed to ${address(seed)} in ${tx.id}`)
    }

    before(async function () {
        await setupAccounts({
            admin: 0.05 * wvs,
            wallet: 0.05 * wvs,
            coordinator: 0.05 * wvs,
            shorter: 0.05 * wvs,
            insurance: 0.05 * wvs,
            staking: 0.05 * wvs,
            longer: 0.11 * wvs,
            oracle: 0.01 * wvs
        });

        console.log(`Admin address is ${address(accounts.admin)}, public key is ${publicKey(accounts.admin)}`)
        console.log(`USDN Donor address is ${address(SEED_USDN_HOLDER)} balance is ${(Math.round((await assetBalance(neutrino, address(SEED_USDN_HOLDER)))) / decimals)}`)

        let p1 = deploy('coordinator.ride' , 3400000, accounts.coordinator , 'Coordinator')
        let p2 = deploy('insurance.ride'   , 3400000, accounts.insurance   , 'Insurance Fund')
        let p3 = deploy('vAMM2.ride'       , 4700000, accounts.wallet      , 'vAMM')

        // Set oracle price to 50 USDN / Waves (AMM price is approx 55)
        //
        let seedOracleTx = data({
            data: [
                {
                    "key": "price",
                    "type": "integer",
                    "value": Math.round(28 * decimals)
                }
            ]
        }, accounts.oracle)

        await broadcast(seedOracleTx)
        console.log(`Seed oracle in ${seedOracleTx.id}`)

        await Promise.all([p1, p2, p3, seedOracleTx])
        // Init coordinator
        {
            console.log(`Setting admin...`)
            const addAdminTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "setAdmin",
                arguments: [ publicKey(accounts.admin) ],
            }, accounts.admin)

            console.log(`setAdmin in ${addAdminTx.id}`)
            await waitForTx(addAdminTx.id)

            const setInsuranceFundTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "setInsuranceFund",
                arguments: [ address(accounts.insurance) ]
            }, accounts.admin)

            console.log(`setInsuranceFund in ${setInsuranceFundTx.id}`)
            
            const setQuoteAssetTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "setQuoteAsset",
                arguments: [ neutrino, neutrinoStaking ]
            }, accounts.admin)

            console.log(`setQuoteAsset in ${setQuoteAssetTx.id}`)

            const setStakingAddressTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "setStakingAddress",
                arguments: [ address(accounts.staking) ]
            }, accounts.admin)

            console.log(`setStakingAddress in ${setStakingAddressTx.id}`)

            const addAmmTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "addAmm",
                arguments: [ address(accounts.wallet), "" ]
            }, accounts.admin)

            console.log(`addAmm in ${addAmmTx.id}`)

            await waitForTx(setInsuranceFundTx.id)
            await waitForTx(setQuoteAssetTx.id)
            await waitForTx(setStakingAddressTx.id)
            await waitForTx(addAmmTx.id)
        }
        
        // Init AMM
        {
            const initTx = invokeScript({
                dApp: address(accounts.wallet),
                call: {
                    function: "initialize",
                    args: [
                        { type: 'integer', value: 100 * decimals },      // _quouteAssetReserve
                        { type: 'integer', value: 1.818  * decimals },   // _baseAssetReserve
                        { type: 'integer', value: 60 },                  // _fundingPeriod = 1 minute
                        { type: 'integer', value: 0.05  * decimals },    // _initMarginRatio = 5%
                        { type: 'integer', value: 0.085 * decimals },    // _maintenanceMarginRatio = 10%
                        { type: 'integer', value: 0.05  * decimals },    // _liquidationFeeRatio = 5%
                        { type: 'integer', value: 0.01  * decimals },    // _fee 1%
                        { type: 'string' , value: address(accounts.oracle) },    // Oracle address
                        { type: 'string' , value: 'price' },                                  // Oracle key
                        { type: 'string' , value: address(accounts.coordinator) },            // Coordinator address,
                        { type: 'integer', value: 0.1   * decimals },    // _spreadLimit 10%
                        { type: 'integer', value: 0.08  * decimals },    // _maxPriceImpact 8%
                    ]
                },
            }, accounts.admin);

            await broadcast(initTx);
            await waitForTx(initTx.id)
        
            console.log('vAMM initialized in ' + initTx.id)
        }

        // Init insurarance
        {
            const initInsuranceTx = await invoke({
                dApp: address(accounts.insurance),
                functionName: "initialize",
                arguments: [ address(accounts.coordinator) ]
            }, accounts.admin)

            await waitForTx(initInsuranceTx.id)
            console.log('Insurance initialized in ' + initInsuranceTx.id)
        }

        // Fund longer account
        {
            const fundLongerTx = transfer({
                assetId: neutrino,
                amount: 20 * decimals,
                recipient: address(accounts.longer)
            }, SEED_USDN_HOLDER)

            await broadcast(fundLongerTx);
            await waitForTx(fundLongerTx.id);

            console.log('Longer funded by: ' + fundLongerTx.id)
        }
    });


    it('Can increase position', async function () {
        const openPositionTx = invokeScript({
            dApp: address(accounts.wallet),
            call: {
                function: "increasePosition",
                args: [
                    { type: 'integer', value: 1 }, // _direction = LONG
                    { type: 'integer', value: 3 * decimals }, // _leverage = 3
                    { type: 'integer', value: 0.000015 * decimals }, // _minBaseAssetAmount = 0.1 WAVES
                ]
            },
            payment: [
                {
                    amount: 10 * decimals,
                    assetId: neutrino
                }
            ]
        }, accounts.longer)

        await broadcast(openPositionTx)
        await waitForTx(openPositionTx.id)

        console.log('Position opened by ' + openPositionTx.id)
    })


    it('Can decrease position', async function () {
        const openPositionTx = invokeScript({
            dApp: address(accounts.wallet),
            call: {
                function: "decreasePosition",
                args: [
                    { type: 'integer', value: 9 * decimals }, // _amount = 0.01
                    { type: 'integer', value: 3 * decimals }, // _leverage = 3
                    { type: 'integer', value: 0.000015 * decimals }, // _minBaseAssetAmount = 0.1 WAVES
                ]
            }
        }, accounts.longer)

        await broadcast(openPositionTx)
        await waitForTx(openPositionTx.id)

        console.log('Position decreased by ' + openPositionTx.id)
    })
})