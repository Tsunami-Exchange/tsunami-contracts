const {
  keccak,
  blake2b,
  base58Encode,
  base16Decode,
} = require("@waves/ts-lib-crypto");

const validateEthAddress = (addr) => {
  return addr != null && addr.length == 42;
};

function ethAddress2waves(ethAddress, chainId) {
  if (validateEthAddress(ethAddress)) {
    ethAddress = ethAddress.substr(2);
  } else {
    throw `Invalid ethereum address: ${ethAddress} `;
  }

  const prefixBytes = new Uint8Array([0x01, chainId]);

  // Раскодировать HEX строку в байты (PK_HASH)
  const pkHashBytes = base16Decode(ethAddress);

  // Сделать чексумму CHECKSUM=keccak256(blake2b256([0x01, CHAIN_ID] + PK_HASH))
  const checksumBytes = new Uint8Array([...prefixBytes, ...pkHashBytes]);
  const checksum = keccak(blake2b(checksumBytes));

  // склеить [0x01, CHAIN_ID] (два байта) + PK_HASH (изначальные 20 байт) + CHECKSUM[1:4] (первые четыре байта чексуммы)
  const wavesBytes = new Uint8Array([
    ...prefixBytes,
    ...pkHashBytes.slice(0, 20),
    ...checksum.slice(0, 4),
  ]);

  // закодировать в base58
  const wavesAddress = base58Encode(wavesBytes);

  return wavesAddress;
}

module.exports = {
  ethAddress2waves,
};
