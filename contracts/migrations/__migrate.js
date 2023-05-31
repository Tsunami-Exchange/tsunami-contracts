const { Environment } = require("../common/common");
const fs = require("fs/promises");

process.on("unhandledRejection", (error) => {
  console.log(error);
  console.log("unhandledRejection", JSON.stringify(error));
});

let adminSeed = null;
let coordinatorAddress = null;

const isMigrated = async (seq) => {
  const masterAddress = address(adminSeed);
  const key = `${coordinatorAddress}_migration`;
  const last = await accountDataByKey(key, masterAddress).then(
    (x) => (x && Number.parseInt(x.value)) || 0
  );
  return last >= seq;
};

const commit = async (seq) => {
  const key = `${coordinatorAddress}_migration`;
  const commitTx = data(
    {
      data: [
        {
          key,
          type: "string",
          value: seq,
        },
      ],
    },
    adminSeed
  );

  await broadcast(commitTx);
  await waitForTx(commitTx.id);

  console.log(`Committed ${seq} in ${commitTx.id}`);
};

const run = async () => {
  if (!env) {
    console.log(`Please run from surfboard`);
    process.exit(0);
  }

  if (!env.CHAIN_ID) {
    console.log(`Please set CHAIN_ID env in surfboard config`);
    process.exit(0);
  }

  if (!env.COORDINATOR_ADDRESS) {
    console.log(`Please set COORDINATOR_ADDRESS env in surfboard config`);
    process.exit(0);
  }

  const chainId = env.CHAIN_ID;

  if (!process.env[`${chainId}_ADMIN_SEED`]) {
    console.error(`${chainId}_ADMIN_SEED is not defined!`);
    process.exit(0);
  }

  adminSeed = process.env[`${chainId}_ADMIN_SEED`];
  const adminAddress = address(adminSeed);
  coordinatorAddress = env.COORDINATOR_ADDRESS;

  console.log(`Migration master address=${adminAddress}`);

  const allFiles = await fs.readdir(__dirname);
  const migrations = allFiles
    .filter((x) => x.match("[0-9]+_.*"))
    .filter((x) => !x.includes("exclude"))
    .map((x) => x.replace(".js", ""));

  let run = false;
  let rerun = process.env["RERUN"];
  let max = process.env["MAX"];
  for (let migration of migrations) {
    let isActualRerun = false;
    const seq = migration.split("_")[0];
    if (max && seq > max) {
      continue;
    }
    let isRun = await isMigrated(seq, chainId);
    if (isRun && rerun == seq) {
      isActualRerun = true;
      isRun = false;
      console.log(`Rerunning migration ${seq}`);
    }
    if (!isRun) {
      run = true;
      const balanceBefore = await balance(adminAddress);
      console.log(`Running migration №${seq}: ${migration}`);

      const m = require(`./${migration}`);
      let success = true;
      try {
        let e = new Environment(process.env[`${chainId}_ADMIN_SEED`]);
        await e.load(coordinatorAddress);

        await m.migrate(e);

        let children = await e.getChildren();
        for (let child of children) {
          e = new Environment(process.env[`${chainId}_ADMIN_SEED`]);
          await e.load(child);
          e.isChild = true;
          await m.migrate(e);
        }
      } catch (e) {
        let error = JSON.stringify(e);
        if (error === "{}") {
          error = "" + e;
        }
        console.error(e);
        console.error(`Migration failed`, error);
        success = false;
        break;
      }

      if (success && !isActualRerun) {
        await commit(seq);
      }

      const balanceAfter = await balance(adminAddress);
      console.log(
        `Migrations cost: ${(balanceBefore - balanceAfter) / 10 ** 8} WAVES`
      );
      console.log(`Current balance: ${balanceAfter / 10 ** 8} WAVES`);
    }
  }

  if (!run) {
    console.log(`No migration is required`);
  }
};

run();
