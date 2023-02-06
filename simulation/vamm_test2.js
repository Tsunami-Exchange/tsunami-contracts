const { expect } = require("chai");
const vamm = require("./vamm");

const ALICE = "Alice";
const BOB = "Bob";
const CAROLL = "Caroll";

const DEFAULT_TOKEN_DECIMALS = 6;

const toFullDigit = (val, decimals = DEFAULT_TOKEN_DECIMALS) => {
  const tokenDigit = 10 ** decimals;
  const bigNumber = val * tokenDigit;
  return Math.round(bigNumber);
};

const toDecimal = (x) => toFullDigit(x);

const gotoNextFundingTime = () => {
  vamm.mock_advanceToFundingBlock();
};

const syncAmmPriceToOracle = () => {
  vamm.setTwapPrice(vamm.getTwapSpotPrice());
};

describe("AMM Simulation Test", async () => {
  beforeEach("setup amm", async () => {
    vamm.reset();
    vamm.init(toFullDigit(100000), toFullDigit(1818), toFullDigit(86400));
  });

  describe("openClosePosition", async () => {
    it("tetst openn close posiion", async () => {
      vamm.openPosition(ALICE, vamm.DIR_LONG, toDecimal(10), toDecimal(3));
      vamm.debug_calcRemainMarginWithFundingPayment(ALICE);
    });
  });
});
