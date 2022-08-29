const decimals = 10 ** 6;

const wait = t => new Promise(s => setTimeout(s, t, t));

module.exports = {
    wait,
    decimals
}