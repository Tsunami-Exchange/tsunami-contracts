const { loadAddress } = require('../common/wallet')

const migrate = async(e) => {
    await e.referral.upgrade()
}

module.exports = {
    migrate
}