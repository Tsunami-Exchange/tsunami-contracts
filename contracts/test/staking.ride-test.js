const wvs = 10 ** 8;
const decimals = 10 ** 6;

const neutrino = "HezsdQuRDtzksAYUy97gfhKy7Z1NW2uXYSHA3bgqenNZ"
const tsn = "HL6bTgU1e5SoaSDxp9PV1Bj8WvKAk8jReNwgax44d5S6"

const SEED_USDN_HOLDER = "inspire slam drum produce flee force fee false sunset give kidney illegal leave gallery story"
const SEED_TSN_HOLDER = "sail dish about glare spin catalog subway fit come space invite metal cereal dash grit"
//const DAPP = address(SEED_DAPP)

describe('Staking should', async function () {

    this.timeout(100000);

    before(async function () {
        
        await setupAccounts({
            admin: 0.05 * wvs,
            dApp: 0.05 * wvs,
            staker: 0.05 * wvs,
            funder: 0.05 * wvs
        });


        const icode = file('rewards.ride')
            .replace('3MseEJNEHkYhvcHre6Mann1F8e27S1qptdg', address(accounts.admin))
            .replace('A6ZtwikNTr19YpC1t6HnNGCBJF6GTx62DhEkJpgpzpmL', publicKey(accounts.admin))
            .replace('HezsdQuRDtzksAYUy97gfhKy7Z1NW2uXYSHA3bgqenNY', tsn)
        
        const iscript = compile(icode);
        const issTx = setScript({ script: iscript, fee: 3200000 }, accounts.dApp);
        await broadcast(issTx);
        await waitForTx(issTx.id)
        
        console.log('Rewards deployed to ' + issTx.id)
    });

    it('Add rewards to staking', async function () {
        const fundFunderTx = transfer({
            assetId: neutrino,
            amount: 1 * decimals,
            recipient: address(accounts.funder)
        }, SEED_USDN_HOLDER)

        await broadcast(fundFunderTx);
        await waitForTx(fundFunderTx.id);

        const addRewardsTx = invokeScript({
            dApp: address(accounts.dApp),
            fee: 500000,
            call: {
                function: "addRewards"
            },
            payment: [
                {
                    amount: 1 * decimals,
                    assetId: neutrino
                }
            ]
        }, accounts.funder)

        await broadcast(addRewardsTx);
        await waitForTx(addRewardsTx.id);

        console.log('Added funds in ' + addRewardsTx.id)
    })

    it('Should stake', async function () {
        const fundStakerTx = transfer({
            assetId: tsn,
            amount: 1 * decimals,
            recipient: address(accounts.staker)
        }, SEED_TSN_HOLDER)

        await broadcast(fundStakerTx);
        await waitForTx(fundStakerTx.id);

        const stakeTx = invokeScript({
            dApp: address(accounts.dApp),
            fee: 500000,
            call: {
                function: "stake"
            },
            payment: [
                {
                    amount: 1 * decimals,
                    assetId: tsn
                }
            ]
        }, accounts.staker)

        await broadcast(stakeTx);
        await waitForTx(stakeTx.id);

        console.log('Staked in ' + stakeTx.id)
    })

    it('Should claim rewards', async function () {
        await waitNBlocks(1)

        const withdrawTx = invokeScript({
            dApp: address(accounts.dApp),
            fee: 500000,
            call: {
                function: "withdrawRewards"
            }
        }, accounts.staker)

        await broadcast(withdrawTx);
        await waitForTx(withdrawTx.id);

        console.log('Got rewards in ' + withdrawTx.id)
    })

    it('Should unstake and claim rest of rewards', async function () {
        await waitNBlocks(1)

        const unstakeTx = invokeScript({
            dApp: address(accounts.dApp),
            fee: 500000,
            call: {
                function: "unStake",
                args: [
                    {
                        "type": "integer",
                        "value": 1 * decimals
                    }
                ]
            }
        }, accounts.staker)

        await broadcast(unstakeTx);
        await waitForTx(unstakeTx.id);

        console.log('Unstaked in ' + unstakeTx.id)

        const withdrawTx = invokeScript({
            dApp: address(accounts.dApp),
            fee: 500000,
            call: {
                function: "withdrawRewards"
            }
        }, accounts.staker)

        await broadcast(withdrawTx);
        await waitForTx(withdrawTx.id);

        console.log('Got rest of rewards in ' + withdrawTx.id)
    })
})