const migrate = async(e) => {
    await e.farming.upgrade()
}

module.exports = {
    migrate
}