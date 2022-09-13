const decimals = 10 ** 6;
const wvs = 10 ** 8;

const wait = t => new Promise(s => setTimeout(s, t, t));

module.exports = {
    wait,
    decimals,
    wvs
}