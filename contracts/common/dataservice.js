const fetch = require("node-fetch");
const publicKeyByAddressCache = {};

const publicKeyByAddress = async (address) => {
  let req = `${env.DS_API_BASE}/v0/transactions/all?sender=${address}&limit=1`;
  const json = await fetch(req).then((x) => x.json());
  if (json.message) {
    throw Error(`Unable to access data service: ${json.message}`);
  }
  if (!json.data || !json.data[0] || !json.data[0].data) {
    throw Error(`No transactions for ${address} request: ${req}`);
  }
  const result = json.data[0].data.senderPublicKey;
  publicKeyByAddressCache[address] = result;
  return result;
};

module.exports = {
  publicKeyByAddress,
};
