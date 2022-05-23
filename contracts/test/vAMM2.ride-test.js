const wvs = 10 ** 8;
const decimals = 10 ** 6;

const neutrino = "HezsdQuRDtzksAYUy97gfhKy7Z1NW2uXYSHA3bgqenNZ"

describe('vAMM should work with positive fundind', async function () {

    this.timeout(100000);

    before(async function () {
        await setupAccounts({
            admin: 0.05 * wvs,
            wallet: 0.05 * wvs,
            shorter: 0.05 * wvs,
            insurance: 0.05 * wvs
        });

        const icode = file('insurance.ride')
            .replace('3MseEJNEHkYhvcHre6Mann1F8e27S1qptdg', address(accounts.admin))
            .replace('A6ZtwikNTr19YpC1t6HnNGCBJF6GTx62DhEkJpgpzpmL', publicKey(accounts.admin))
        
        const iscript = compile(icode);
        const issTx = setScript({ script: iscript, fee: 3200000 }, accounts.insurance);
        await broadcast(issTx);
        await waitForTx(issTx.id)
        
        console.log('Insurance Fund Deployed to ' + issTx.id)
        
        const code = file('vAMM2.ride')
            .replace('3MseEJNEHkYhvcHre6Mann1F8e27S1qptdg', address(accounts.admin))
            .replace('3MzXE3znRvRJTNdvCtPXBRp6Bx5HSTsc3rS', address(accounts.insurance))
        
        const script = compile(code);
        const ssTx = setScript({ script, fee: 3200000 }, accounts.wallet);
        await broadcast(ssTx);

        const addWhitelistTx = invokeScript({
            dApp: address(accounts.insurance),
            call: {
                function: "addWhitelist",
                args: [
                    { type: 'string', value: address(accounts.wallet) }
                ]
            },
            
        }, accounts.admin)

        await broadcast(addWhitelistTx)

        await waitForTx(addWhitelistTx.id)
        await waitForTx(ssTx.id)

        console.log('vAMM Deployed to ' + ssTx.id)

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
                ]
            },
        }, accounts.admin);

        await broadcast(initTx);
        
        console.log('vAMM Initialized by ' + initTx.id)

        const fundShorterTx = transfer({
            assetId: neutrino,
            amount: 5 * decimals,
            recipient: address(accounts.shorter)
        })

        await broadcast(fundShorterTx);

        await waitForTx(initTx.id);
        await waitForTx(fundShorterTx.id);

        console.log('Shorter funded by: ' + fundShorterTx.id)
    });

    it('Can add insurance funds', async function () {
        const fundAdminTx = transfer({
            assetId: neutrino,
            amount: 1 * decimals,
            recipient: address(accounts.admin)
        })

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
        })

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
        })

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
        })

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
        })

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
        })

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
        })

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
        })

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

    before(async function () {
        await setupAccounts({
            admin: 0.05 * wvs,
            wallet: 0.05 * wvs,
            shorter: 0.05 * wvs,
            insurance: 0.05 * wvs
        });

        const icode = file('insurance.ride')
            .replace('3MseEJNEHkYhvcHre6Mann1F8e27S1qptdg', address(accounts.admin))
            .replace('A6ZtwikNTr19YpC1t6HnNGCBJF6GTx62DhEkJpgpzpmL', publicKey(accounts.admin))
        
        const iscript = compile(icode);
        const issTx = setScript({ script: iscript, fee: 3200000 }, accounts.insurance);
        await broadcast(issTx);
        await waitForTx(issTx.id)
        
        console.log('Insurance Fund Deployed to ' + issTx.id)
        
        const code = file('vAMM2.ride')
            .replace('3MseEJNEHkYhvcHre6Mann1F8e27S1qptdg', address(accounts.admin))
            .replace('3MzXE3znRvRJTNdvCtPXBRp6Bx5HSTsc3rS', address(accounts.insurance))
        
        const script = compile(code);
        const ssTx = setScript({ script, fee: 3200000 }, accounts.wallet);
        await broadcast(ssTx);

        const addWhitelistTx = invokeScript({
            dApp: address(accounts.insurance),
            call: {
                function: "addWhitelist",
                args: [
                    { type: 'string', value: address(accounts.wallet) }
                ]
            },
            
        }, accounts.admin)

        await broadcast(addWhitelistTx)

        await waitForTx(addWhitelistTx.id)
        await waitForTx(ssTx.id)

        console.log('vAMM Deployed to ' + ssTx.id)

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
                ]
            },
        }, accounts.admin);

        await broadcast(initTx);
        
        console.log('vAMM Initialized by ' + initTx.id)

        const fundShorterTx = transfer({
            assetId: neutrino,
            amount: 10 * decimals,
            recipient: address(accounts.shorter)
        })

        await broadcast(fundShorterTx);

        await waitForTx(initTx.id);
        await waitForTx(fundShorterTx.id);

        console.log('Shorter funded by: ' + fundShorterTx.id)
    });

    it('Can add insurance funds', async function () {
        const fundAdminTx = transfer({
            assetId: neutrino,
            amount: 1 * decimals,
            recipient: address(accounts.admin)
        })

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
        })

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
        const viewMarginRatio = invokeScript({
            dApp: address(accounts.wallet),
            call: {
                function: "view_getMarginRatio",
                args: [
                    { type: 'string', value: '3MseEJNEHkYhvcHre6Mann1F8e27S1qptdg' }
                ]
            }
        }, accounts.shorter)

        try {
            await broadcast(viewMarginRatio);
        } catch (e) {
            console.log(`Margin ratio = ${JSON.stringify(e)}`)
        }

        const liquidatePositionTx = invokeScript({
            dApp: address(accounts.wallet),
            call: {
                function: "liquidate",
                args: [
                    { type: 'string', value: '3MseEJNEHkYhvcHre6Mann1F8e27S1qptdg' }
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