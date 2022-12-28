const fs = require("fs");
const fetch = require("node-fetch");
const { ethAddress2waves } = require("./convert");

const candidaes = fs.readFileSync("./raw_all.txt").toString().split("\n");
const valid = JSON.parse(fs.readFileSync("./valid.json"));
const final = [];

const run = async () => {
  let j = 0;
  for (let c of candidaes) {
    if (!valid.includes(c)) {
      if (c.startsWith("0x")) {
        try {
          c = ethAddress2waves(c, "T".charCodeAt(0));
        } catch (e) {
          console.log(`Invalid ethereum address: ${c}`);
        }
      }
      const r = await fetch(
        `https://nodes-testnet.wavesnodes.com/addresses/validate/${c}`
      )
        .then((x) => x.json())
        .catch((x) => ({ valid: false }));
      if (r.valid) {
        final.push(c);
      }
      j++;
      console.log(`Address ${j} ${c} isValid=${r.valid}`);
    }

    if (j % 100 == 0) {
      for (let x of final) {
        if (!valid.includes(x)) {
          valid.push(x);
        }
      }
      fs.writeFileSync("./valid.json", JSON.stringify(valid, null, 2));
    }
  }
  for (let x of final) {
    if (!valid.includes(x)) {
      valid.push(x);
    }
  }
  fs.writeFileSync("./valid.json", JSON.stringify(valid, null, 2));
};

run();
