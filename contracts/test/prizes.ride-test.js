chai.config.includeStack = true
chai.use(require('chai-as-promised'))

process.on('unhandledRejection', error => {
    console.log('unhandledRejection', JSON.stringify(error));
});

const wvs = 10 ** 8;

const { expect } = require('chai');
const { Environment } = require('../common/common');

const createTokenSignature = (_signer, _nonce, _recipient, _assetId, _amount) => {
    const prizeStr = `${_nonce},${_recipient},${_assetId},${_amount}`
    const r = [[_nonce, _recipient, _assetId, _amount], signBytes(_signer, new TextEncoder().encode(prizeStr))]
    return r
}

describe('Prize Manager should be able', async function () {

    this.timeout(600000);

    let e, user, user2

    before(async function () {
        await setupAccounts({
            admin: 1 * wvs,
            user: 0.1 * wvs,
            user2: 0.1 * wvs,
        });

        user = accounts.user
        user2 = accounts.user2

        e = new Environment(accounts.admin)
        await e.deploy()
        await e.supplyTsn(100, address(e.seeds.prizes))
    });

    let seed = 1

    function uuidv4() {
        return "" + (seed++)
    }

    it('to send rewards to user with correct signature', async function () {
        let [data, signature] = createTokenSignature(e.seeds.admin, uuidv4(), address(user), e.assets.tsn, 1 * wvs)
        await e.prizes.as(user).claimPrize(...data, signature)
        let balance = await assetBalance(e.assets.tsn, address(user))

        let tsnBalance = Math.round(balance / wvs)
        expect(tsnBalance).to.be.eq(1)
    })

    it('to reject double claim of same reward', async function () {
        let [data, signature] = createTokenSignature(e.seeds.admin, uuidv4(), address(user), e.assets.tsn, 1 * wvs)
        await e.prizes.as(user).claimPrize(...data, signature)
        expect(e.prizes.as(user).claimPrize(...data, signature)).to.eventually.be.rejected
    })

    it('to reject claim signed by wrong address', async function () {
        let [data, signature] = createTokenSignature(e.seeds.prizes, uuidv4(), address(user), e.assets.tsn, 1 * wvs)
        expect(e.prizes.as(user).claimPrize(...data, signature)).to.eventually.be.rejected
    })

    it('to reject claim from wrong user', async function () {
        let [data, signature] = createTokenSignature(e.seeds.admin, uuidv4(), address(user), e.assets.tsn, 1 * wvs)
        expect(e.prizes.as(user2).claimPrize(...data, signature)).to.eventually.be.rejected
    })
})