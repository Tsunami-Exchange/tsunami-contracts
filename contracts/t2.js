let ttx = {
  type: 16,
  id: "8xcYJspZjAJSaPFcQ2kebQGF2jNVBk4fuzRgijRvMLrS",
  fee: 500000,
  feeAssetId: null,
  timestamp: 1671640945279,
  version: 2,
  chainId: 82,
  sender: "3M978eLvnKcMQ7hUKMHPrdUzPv8kXRvte6J",
  senderPublicKey: "ESvezgRFiYANLjSX3Xpa5hKbQyswyvHdowxDfP1km1qv",
  proofs: [
    "37nfGjnYBJoMF3YLk6JdsJuadHb8fbDYViuACLBZSiVKKTFCgtDVVZZDiFtxR6M9nDCj5psqejZd9kFKFZd1qf1q",
  ],
  dApp: "3MGGKXBFZdnT8zDspvyjAYXwtL6hTP9TRBA",
  payment: [],
  call: {
    function: "createOrder",
    args: [
      { type: "string", value: "3MLidpTviGC6ZQG6Cnst7LKFZLpFcJGEX6i" },
      { type: "integer", value: 2 },
      { type: "integer", value: 67000000 },
      { type: "integer", value: 0 },
      { type: "integer", value: 53840095 },
      { type: "integer", value: 0 },
      { type: "integer", value: 2 },
      { type: "string", value: "" },
    ],
  },
  height: 63105,
  applicationStatus: "succeeded",
  spentComplexity: 391,
  stateChanges: {
    data: [],
    transfers: [],
    issues: [],
    reissues: [],
    burns: [],
    sponsorFees: [],
    leases: [],
    leaseCancels: [],
    invokes: [
      {
        dApp: "3MGGKXBFZdnT8zDspvyjAYXwtL6hTP9TRBA",
        call: {
          function: "cleanUpStaleOrders",
          args: [
            { type: "String", value: "3MLidpTviGC6ZQG6Cnst7LKFZLpFcJGEX6i" },
            { type: "String", value: "3M978eLvnKcMQ7hUKMHPrdUzPv8kXRvte6J" },
          ],
        },
        payment: [],
        stateChanges: {
          data: [],
          transfers: [],
          issues: [],
          reissues: [],
          burns: [],
          sponsorFees: [],
          leases: [],
          leaseCancels: [],
          invokes: [],
        },
      },
      {
        dApp: "3MGGKXBFZdnT8zDspvyjAYXwtL6hTP9TRBA",
        call: {
          function: "internalCreateOrder",
          args: [
            { type: "String", value: "3M978eLvnKcMQ7hUKMHPrdUzPv8kXRvte6J" },
            { type: "String", value: "3MLidpTviGC6ZQG6Cnst7LKFZLpFcJGEX6i" },
            { type: "Int", value: 2 },
            { type: "Int", value: 67000000 },
            { type: "Int", value: 0 },
            { type: "Int", value: 53840095 },
            { type: "Int", value: 0 },
            { type: "Int", value: 2 },
            { type: "String", value: "" },
            { type: "String", value: "" },
            { type: "Int", value: 0 },
          ],
        },
        payment: [],
        stateChanges: {
          data: [
            {
              key: "k_order_1",
              type: "string",
              value:
                "3MLidpTviGC6ZQG6Cnst7LKFZLpFcJGEX6i,3M978eLvnKcMQ7hUKMHPrdUzPv8kXRvte6J,53840095,0,2,67000000,0,2,,1,0",
            },
            {
              key: "k_traderOrderIds_3MLidpTviGC6ZQG6Cnst7LKFZLpFcJGEX6i_3M978eLvnKcMQ7hUKMHPrdUzPv8kXRvte6J",
              type: "string",
              value: "1",
            },
            {
              key: "k_traderOrderCnt_3MLidpTviGC6ZQG6Cnst7LKFZLpFcJGEX6i_3M978eLvnKcMQ7hUKMHPrdUzPv8kXRvte6J",
              type: "integer",
              value: 1,
            },
            { key: "k_lastOrderId", type: "integer", value: 1 },
          ],
          transfers: [],
          issues: [],
          reissues: [],
          burns: [],
          sponsorFees: [],
          leases: [],
          leaseCancels: [],
          invokes: [],
        },
      },
    ],
  },
};
let id = ttx.stateChanges.invokes
  .flatMap((i) => i.stateChanges.data)
  .filter((x) => x.key === "k_lastOrderId")
  .map((x) => x.value)[0];

console.log(id);
