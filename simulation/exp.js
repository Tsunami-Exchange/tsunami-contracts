// p(b) = (e ^ U_b) / (e ^ U_a + e ^ U_b + e ^ U_nc)

/*
const U_b = 16.218
const U_a = 7.047
const U_nc = 15.709

const pb = Math.exp(U_b) / (Math.exp(U_a) + Math.exp(U_b) + Math.exp(U_nc))
const pa = Math.exp(U_a) / (Math.exp(U_a) + Math.exp(U_b) + Math.exp(U_nc))
const pnc = Math.exp(U_nc) / (Math.exp(U_a) + Math.exp(U_b) + Math.exp(U_nc))

console.log(pb)
console.log(pa)
console.log(pnc)

*/

const cost = 0.74 * 10_000_000
const y1 = 7_000_000 * 0.045 * 80 / 2
const y2 = 3_000_000 * 0.01 * 80 /2

console.log(`cost=${cost}`)
console.log(`y1 = ${y1} spend=${7_000_000 * 0.74}`)
console.log(`y2 = ${y2} spend=${3_000_000 * 0.74}`)
console.log(y1 + y2 - cost)

14_600_000

3_733_333