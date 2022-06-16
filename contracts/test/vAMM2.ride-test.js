const wvs = 10 ** 8;
const decimals = 10 ** 6;

const neutrino = "HezsdQuRDtzksAYUy97gfhKy7Z1NW2uXYSHA3bgqenNZ"
const neutrinoStaking = "3N9LkJahTMx41wGhSxLS42prCZtRCp4dhTs"

const SEED_USDN_HOLDER = "inspire slam drum produce flee force fee false sunset give kidney illegal leave gallery story"

describe('vAMM should work with positive fundind', async function () {

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
            longer: 0.05 * wvs
        });

        console.log(`Admin address is ${address(accounts.admin)}, public key is ${publicKey(accounts.admin)}`)
        console.log(`USDN Donor address is ${address(SEED_USDN_HOLDER)} balance is ${(Math.round((await assetBalance(neutrino, address(SEED_USDN_HOLDER)))) / decimals)}`)

        let p1 = deploy('coordinator.ride' , 3400000, accounts.coordinator , 'Coordinator')
        let p2 = deploy('insurance.ride'   , 3400000, accounts.insurance   , 'Insurance Fund')
        let p3 = deploy('vAMM2.ride'       , 3400000, accounts.wallet      , 'vAMM')

        await Promise.all([p1, p2, p3])
        // Init coordinator
        {
            console.log(`Setting admin...`)
            const addAdminTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "setAdmin",
                arguments: [ address(accounts.admin), publicKey(accounts.admin) ],
            }, accounts.admin)

            await waitForTx(addAdminTx.id)
            console.log(`setAdmin in ${addAdminTx.id}`)

            const setInsuranceFundTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "setInsuranceFund",
                arguments: [ address(accounts.insurance) ]
            }, accounts.admin)

            console.log(`setInsuranceFund in ${setInsuranceFundTx.id}`)
            await waitForTx(setInsuranceFundTx.id)

            const setQuoteAssetTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "setQuoteAsset",
                arguments: [ neutrino, neutrinoStaking ]
            }, accounts.admin)

            console.log(`setQuoteAsset in ${setQuoteAssetTx.id}`)
            await waitForTx(setQuoteAssetTx.id)

            const setStakingAddressTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "setStakingAddress",
                arguments: [ address(accounts.staking) ]
            }, accounts.admin)

            console.log(`setStakingAddress in ${setStakingAddressTx.id}`)
            await waitForTx(setStakingAddressTx.id)

            const addAmmTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "addAmm",
                arguments: [ address(accounts.wallet), "" ]
            }, accounts.admin)

            console.log(`addAmm in ${addAmmTx.id}`)
            await waitForTx(addAmmTx.id)
        }
        
        // Init AMM
        {
            const initTx = invokeScript({
                dApp: address(accounts.wallet),
                call: {
                    function: "initialize",
                    args: [
                        { type: 'integer', value: 100000 * decimals },  // _quouteAssetReserve
                        { type: 'integer', value: 1818  * decimals },   // _baseAssetReserve
                        { type: 'integer', value: 60 },                 // _fundingPeriod = 1 minute
                        { type: 'integer', value: 0.05 * decimals },    // _initMarginRatio
                        { type: 'integer', value: 0.1 * decimals },     // _maintenanceMarginRatio
                        { type: 'integer', value: 0.05 * decimals },    // _liquidationFeeRatio
                        { type: 'integer', value: 0.01 * decimals },    // _fee 1%
                        { type: 'string' , value: '3N4NS7d4Jo9a6F14LiFUKKYVdUkkf2eP4Zx' },    // _fee 1%
                        { type: 'string' , value: 'price' },            // _fee 1%,
                        { type: 'string' , value: address(accounts.coordinator) },            // _fee 1%
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
    })

    it('Can decrease position', async function () {
        const decreasePositionTx = invokeScript({
            dApp: address(accounts.wallet),
            call: {
                function: "decreasePosition",
                args: [
                    { type: 'integer', value: 2 }, // _direction = SHORT
                    { type: 'integer', value: 3 * decimals }, // _amount = 3
                    { type: 'integer', value: 3 * decimals }, // _leverage = 3
                    { type: 'integer', value: 0.15 * decimals }, // _minBaseAssetAmount = 0.1 WAVES
                ]
            }
        }, accounts.longer)

        await broadcast(decreasePositionTx);
        await waitForTx(decreasePositionTx.id);

        console.log('Position decreased by ' + decreasePositionTx.id)
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
    })

    it('Can pay funding', async function () {
        const quouteAssetReserve = await accountDataByKey("k_quouteAssetReserve", address(accounts.wallet))
        const baseAssetReserve = await accountDataByKey("k_baseAssetReserve", address(accounts.wallet))

        console.log(`quouteAssetReserve=${JSON.stringify(quouteAssetReserve)}`)
        console.log(`baseAssetReserve=${JSON.stringify(baseAssetReserve)}`)

        await waitNBlocks(1, {
            timeout: 100000
        })

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

describe('vAMM should be able to liquidate underwater position', async function () {

    this.timeout(100000);

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
            longer: 0.05 * wvs
        });

        console.log(`Admin address is ${address(accounts.admin)}, public key is ${publicKey(accounts.admin)}`)
        console.log(`USDN Donor address is ${address(SEED_USDN_HOLDER)} balance is ${(Math.round((await assetBalance(neutrino, address(SEED_USDN_HOLDER)))) / decimals)}`)

        let p1 = deploy('coordinator.ride' , 3400000, accounts.coordinator , 'Coordinator')
        let p2 = deploy('insurance.ride'   , 3400000, accounts.insurance   , 'Insurance Fund')
        let p3 = deploy('vAMM2.ride'       , 3400000, accounts.wallet      , 'vAMM')

        await Promise.all([p1, p2, p3])
        // Init coordinator
        {
            console.log(`Setting admin...`)
            const addAdminTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "setAdmin",
                arguments: [ address(accounts.admin), publicKey(accounts.admin) ],
            }, accounts.admin)

            await waitForTx(addAdminTx.id)
            console.log(`setAdmin in ${addAdminTx.id}`)

            const setInsuranceFundTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "setInsuranceFund",
                arguments: [ address(accounts.insurance) ]
            }, accounts.admin)

            console.log(`setInsuranceFund in ${setInsuranceFundTx.id}`)
            await waitForTx(setInsuranceFundTx.id)

            const setQuoteAssetTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "setQuoteAsset",
                arguments: [ neutrino, neutrinoStaking ]
            }, accounts.admin)

            console.log(`setQuoteAsset in ${setQuoteAssetTx.id}`)
            await waitForTx(setQuoteAssetTx.id)

            const setStakingAddressTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "setStakingAddress",
                arguments: [ address(accounts.staking) ]
            }, accounts.admin)

            console.log(`setStakingAddress in ${setStakingAddressTx.id}`)
            await waitForTx(setStakingAddressTx.id)

            const addAmmTx = await invoke({
                dApp: address(accounts.coordinator),
                functionName: "addAmm",
                arguments: [ address(accounts.wallet), "" ]
            }, accounts.admin)

            console.log(`addAmm in ${addAmmTx.id}`)
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
                        { type: 'integer', value: 60 },                 // _fundingPeriod = 1 minute
                        { type: 'integer', value: 0.05 * decimals },    // _initMarginRatio
                        { type: 'integer', value: 0.09 * decimals },    // _maintenanceMarginRatio
                        { type: 'integer', value: 0.05 * decimals },    // _liquidationFeeRatio
                        { type: 'integer', value: 0.01 * decimals },    // _fee 1%
                        { type: 'string' , value: '3N4NS7d4Jo9a6F14LiFUKKYVdUkkf2eP4Zx' },    // _fee 1%
                        { type: 'string' , value: 'price' },            // _fee 1%,
                        { type: 'string' , value: address(accounts.coordinator) },            // _fee 1%
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
                    { type: 'integer', value: 3 * decimals }, // _leverage = 1
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

        await broadcast(liquidatePositionTx);   
        await waitForTx(liquidatePositionTx.id);

        console.log('Position liquidated by ' + liquidatePositionTx.id)
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