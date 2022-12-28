const fs = require("fs");

const valid = JSON.parse(fs.readFileSync("./valid.json"));
const got = JSON.parse(fs.readFileSync("./got.json"));
const give = [];
const run = async () => {
  for (let v of valid) {
    if (!got.includes(v)) {
      give.push(v);
    }
  }

  fs.writeFileSync("./give.json", JSON.stringify(give, null, 2));
};

run();
