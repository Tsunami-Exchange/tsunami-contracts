chai.config.includeStack = true;
chai.use(require("chai-as-promised"));

process.on("unhandledRejection", (error) => {
  console.log("unhandledRejection", JSON.stringify(error));
});

const wvs = 10 ** 8;
const DIR_LONG = 1;
const DIR_SHORT = 2;

const { expect } = require("chai");
const { Environment, AMM, Vault } = require("../common/common");

describe("Spot vAMM should swap Waves <-> USDN", async function () {
  this.timeout(600000);

  /**
   * @type {Environment}
   */
  let e;

  /**
   * @type {{amm: AMM, vault: Vault}}
   */
  let waves_spot;

  /**
   * @type {{amm: AMM, vault: Vault}}
   */
  let usdn_spot;

  let waves_trader, waves_lp, usdt_lp;

  before(async function () {
    await setupAccounts({
      admin: 1 * wvs,
      longer: 0.1 * wvs,
      shorter: 0.1 * wvs,
      liquidator: 0.1 * wvs,
      waves_lp: 101 * wvs,
      usdt_lp: 0.1 * wvs,
      waves_trader: 11 * wvs,
    });

    longer = accounts.longer;
    shorter = accounts.shorter;
    liquidator = accounts.liquidator;
    waves_trader = accounts.waves_trader;
    usdt_lp = accounts.usdt_lp;
    waves_lp = accounts.waves_lp;

    e = new Environment(accounts.admin);
    await e.deploy();
    await e.fundAccounts({
      [longer]: 170,
      [shorter]: 100,
      [waves_trader]: 1000,
      [usdt_lp]: 1000,
    });

    waves_spot = await e.deploySpotAmm(100000, 55, {
      asset: "WAVES",
    });
    usdn_spot = await e.deploySpotAmm(10000000, 1, {
      asset: e.assets.neutrino,
    });
  });

  it("Can LP Waves", async function () {
    await waves_spot.vault.as(waves_lp).stake(100);
  });

  it("Can LP USDN", async function () {
    await usdn_spot.vault.as(usdt_lp).stake(1000);
  });

  it("Can swap WAVES -> USDN", async function () {
    {
      let price = await waves_spot.amm.getMarketPrice();
      expect(price).to.be.equal(55);

      let rateWaves = await waves_spot.vault.rate();
      expect(rateWaves).to.be.equal(1);

      let rateUsdn = await usdn_spot.vault.rate();
      expect(rateUsdn).to.be.equal(1);
    }
    {
      let wavesBalance = await waves_spot.vault.usdnBalanceOf(waves_lp);
      let freeBalance = await waves_spot.vault.freeBalance();
      let excessBalance = await waves_spot.vault.excessBalance();

      console.log(
        `wavesBalance=${wavesBalance} freeBalance=${freeBalance} excessBalance=${excessBalance} balance=${
          freeBalance + excessBalance
        }`
      );
    }
    {
      let usdnBalance = await usdn_spot.vault.usdnBalanceOf(usdt_lp);
      let freeBalance = await usdn_spot.vault.freeBalance();
      let excessBalance = await usdn_spot.vault.excessBalance();
      console.log(
        `usdnBalance=${usdnBalance} freeBalance=${freeBalance} excessBalance=${excessBalance} balance=${
          freeBalance + excessBalance
        }`
      );
    }

    let estimation = await e.spot.estimateSwap(10, "WAVES", e.assets.neutrino);
    console.log(JSON.stringify(estimation));

    expect(estimation.tax).to.be.closeTo(0.1091, 0.001);

    await e.spot.as(waves_trader).swap("WAVES", 10, e.assets.neutrino, 0);

    {
      let wavesBalance = await waves_spot.vault.usdnBalanceOf(waves_lp);
      let freeBalance = await waves_spot.vault.freeBalance();
      let excessBalance = await waves_spot.vault.excessBalance();

      console.log(
        `wavesBalance=${wavesBalance} freeBalance=${freeBalance} excessBalance=${excessBalance} balance=${
          freeBalance + excessBalance
        }`
      );
    }
    {
      let usdnBalance = await usdn_spot.vault.usdnBalanceOf(usdt_lp);
      let freeBalance = await usdn_spot.vault.freeBalance();
      let excessBalance = await usdn_spot.vault.excessBalance();

      console.log(
        `usdnBalance=${usdnBalance} freeBalance=${freeBalance} excessBalance=${excessBalance} balance=${
          freeBalance + excessBalance
        }`
      );
    }

    {
      let price = await waves_spot.amm.getMarketPrice();
      expect(price).to.be.equal(54.4);

      let rateWaves = await waves_spot.vault.rate();
      expect(rateWaves).to.be.equal(1);

      let rateUsdn = await usdn_spot.vault.rate();
      expect(rateUsdn).to.be.equal(1.0613);
    }

    // TODO: Check swap amounts
  });

  it("Can swap USDN -> WAVES", async function () {
    let estimation = await e.spot.estimateSwap(
      546.965,
      e.assets.neutrino,
      "WAVES"
    );
    console.log(JSON.stringify(estimation));

    await e.spot.as(waves_trader).swap(e.assets.neutrino, 546.965, "WAVES", 0);

    {
      let wavesBalance = await waves_spot.vault.usdnBalanceOf(waves_lp);
      let freeBalance = await waves_spot.vault.freeBalance();
      let excessBalance = await waves_spot.vault.excessBalance();

      console.log(
        `wavesBalance=${wavesBalance} freeBalance=${freeBalance} excessBalance=${excessBalance} balance=${
          freeBalance + excessBalance
        }`
      );
    }
    {
      let usdnBalance = await usdn_spot.vault.usdnBalanceOf(usdt_lp);
      let freeBalance = await usdn_spot.vault.freeBalance();
      let excessBalance = await usdn_spot.vault.excessBalance();
      console.log(
        `usdnBalance=${usdnBalance} freeBalance=${freeBalance} excessBalance=${excessBalance} balance=${
          freeBalance + excessBalance
        }`
      );
    }

    // TODO: Check swap amounts

    {
      let price = await waves_spot.amm.getMarketPrice();
      expect(price).to.be.equal(55);

      let rateWaves = await waves_spot.vault.rate();
      expect(rateWaves).to.be.equal(1);

      let rateUsdn = await usdn_spot.vault.rate();
      expect(rateUsdn).to.be.equal(1.0613);
    }
  });

  /*
  it("Can withdraw Waves LP", async function () {
    let wavesBalance = await waves_spot.vault.usdnBalanceOf(waves_lp)
    let freeBalance = await waves_spot.vault.freeBalance()
    let excessBalance = await waves_spot.vault.excessBalance()
    console.log(`wavesBalance=${wavesBalance} freeBalance=${freeBalance} excessBalance=${excessBalance}`)
  });

  it("Can withdraw USDN LP", async function () {
    let usdnBalance = await usdn_spot.vault.usdnBalanceOf(usdt_lp)
    let freeBalance = await usdn_spot.vault.freeBalance()
    let excessBalance = await usdn_spot.vault.excessBalance()
    console.log(`usdnBalance=${usdnBalance} freeBalance=${freeBalance} excessBalance=${excessBalance}`)
  });
  */
});
