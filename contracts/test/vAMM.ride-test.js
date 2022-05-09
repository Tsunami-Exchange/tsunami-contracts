const wvs = 10 ** 8;
const decimals = 10 ** 6;

const neutrino = "HezsdQuRDtzksAYUy97gfhKy7Z1NW2uXYSHA3bgqenNZ"

describe('vAMM test suite', async function () {

    this.timeout(100000);

    before(async function () {
        await setupAccounts({
            admin: 0.15 * wvs,
            wallet: 0.15 * wvs,
        });
        
        const code = file('vAMM.ride').replace('3MseEJNEHkYhvcHre6Mann1F8e27S1qptdg', address(accounts.admin))
        console.log(code)
        const script = compile(code);
        const ssTx = setScript({ script }, accounts.wallet);
        await broadcast(ssTx);
        await waitForTx(ssTx.id)
        console.log('vAMM Deployed to ' + ssTx.id)

        const initTx = invokeScript({
            dApp: address(accounts.wallet),
            call: {
                function: "initialize",
                args: [
                    { type: 'integer', value: 100000 * decimals }, // _quouteAssetReserve
                    { type: 'integer', value: 1818  * decimals }, // _baseAssetReserve
                    { type: 'integer', value: 86400 * decimals }, // _fundingPeriod
                    { type: 'integer', value: 0.05 * decimals }, // _initMarginRatio
                    { type: 'integer', value: 0.1 * decimals }, // _maintenanceMarginRatio
                    { type: 'integer', value: 0.05 * decimals }, // _liquidationFeeRatio
                ]
            },
        }, accounts.admin);

        await broadcast(initTx);
        await waitForTx(initTx.id);

        console.log('vAMM Initialized by ' + initTx.id)
    });


    it('Can open position', async function () {
        const openPositionTx = invokeScript({
            dApp: address(accounts.wallet),
            call: {
                function: "openPosition",
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
                function: "openPosition",
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
})