const { publicKeyByAddress } = require("./dataservice");
const { scriptByAddress } = require("./node");

const deploy = async (filename, fee, seed, name, injectTimer, timerAddress) => {
  let code = file(filename);
  if (injectTimer) {
    code = code.replace(
      "lastBlock.timestamp",
      `addressFromStringValue("${timerAddress}").getInteger("timestamp").valueOrElse(${new Date().getTime()})`
    );
    console.log(`Injected timer to ${name}`);
  }
  const script = compile(code);
  const oldScript = await scriptByAddress(address(seed));
  if (script === oldScript) {
    console.log(`${name} already deployed to ${address(seed)}`);
    return;
  }
  const tx = setScript({ script, fee }, seed);
  await broadcast(tx);
  console.log(`${name} deployed to ${address(seed)} in ${tx.id}`);
  return waitForTx(tx.id);
};

const shouldUpgrade = async (filename, address) => {
  const code = file(filename);
  const script = compile(code);
  if (!address) {
    throw `Address not defined`;
  }
  const oldScript = await scriptByAddress(address);
  return script !== oldScript;
};

const upgrade = async (filename, address, fee, adminSeed) => {
  const code = file(filename);
  const script = compile(code);
  if (!address) {
    throw `Address not defined`;
  }
  const oldScript = await scriptByAddress(address);
  if (script === oldScript) {
    console.log(`${filename} already deployed to ${address}`);
    return;
  }
  const senderPublicKey = await publicKeyByAddress(address);
  console.log(`senderPublicKey=${senderPublicKey} for address=${address}`);
  if (!senderPublicKey) {
    throw `No sender public key`;
  }
  if (senderPublicKey === publicKey(adminSeed)) {
    throw `Can not install script on admin account`;
  }
  const issTx = setScript(
    {
      senderPublicKey,
      script,
      fee,
    },
    adminSeed
  );

  const approveTx = data(
    {
      data: [
        {
          key: `status_${address}_${issTx.id}`,
          type: "boolean",
          value: true,
        },
      ],
    },
    adminSeed
  );

  await broadcast(approveTx);
  await waitForTx(approveTx.id);

  await broadcast(issTx);
  await waitForTx(issTx.id);

  return issTx;
};

const clearScript = async (seed) => {
  const script = null;
  const issTx = setScript(
    {
      senderPublicKey: publicKey(seed),
      script,
    },
    seed
  );

  await broadcast(issTx);
  await waitForTx(issTx.id);

  return issTx;
};

module.exports = {
  deploy,
  upgrade,
  clearScript,
  shouldUpgrade,
};
