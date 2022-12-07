const { publicKeyByAddress } = require("./dataservice");
let {
  deploy,
  upgrade,
  clearScript,
  shouldUpgrade,
} = require("../common/driver");
let { wait } = require("../common/utils");

const wvs = 10 ** 8;
const decimals = 10 ** 6;

class Environment {
  constructor(admin) {
    this.seeds = {};
    this.assets = {};
    this.addresses = {};

    this.seeds.admin = admin;

    console.log(
      `Created new Environment adminAddress=${address(this.seeds.admin)}`
    );

    if (env.CHAIN_ID === "R") {
      console.log(`Running in local environment...`);
      this.isLocal = true;
    } else {
      this.isLocal = false;
    }
  }

  async load(coordinatorAddress) {
    if (!coordinatorAddress) {
      throw Error(`No coordinator address`);
    }
    this.addresses = {};
    this.addresses.coordinator = coordinatorAddress;

    console.log(`coordinatorAddress=${coordinatorAddress}`);

    const govAsset = await accountDataByKey(
      `k_gov_asset`,
      coordinatorAddress
    ).then((x) => x.value);
    const quoteAsset = await accountDataByKey(
      `k_quote_asset`,
      coordinatorAddress
    ).then((x) => x.value);

    const insuranceAddress = await accountDataByKey(
      `k_insurance_address`,
      coordinatorAddress
    ).then((x) => x && x.value);
    const managerAddress = await accountDataByKey(
      `k_manager_address`,
      coordinatorAddress
    ).then((x) => x && x.value);
    const stakingAddress = await accountDataByKey(
      `k_staking_address`,
      coordinatorAddress
    ).then((x) => x && x.value);
    const farmingAddress = await accountDataByKey(
      `k_farming_address`,
      coordinatorAddress
    ).then((x) => x && x.value);
    const referralAddress = await accountDataByKey(
      `k_referral_address`,
      coordinatorAddress
    ).then((x) => x && x.value);
    const minerAddress = await accountDataByKey(
      `k_miner_address`,
      coordinatorAddress
    ).then((x) => x && x.value);
    const vaultAddress = await accountDataByKey(
      `k_vault_address`,
      coordinatorAddress
    ).then((x) => x && x.value);

    let allKeys = await accountData(coordinatorAddress);
    allKeys = Object.keys(allKeys).map((k) => allKeys[k]);
    const ammAddresses = allKeys
      .filter((x) => x.key.startsWith(`k_amm_3`))
      .map((x) => x.key.replace(`k_amm_`, ``));

    this.assets.tsn = govAsset;
    this.assets.neutrino = quoteAsset;

    this.amms = ammAddresses.map((x) => new AMM(this, x));
    this.insurance = new Insurance(this, insuranceAddress);
    this.manager = new Manager(this, managerAddress);
    this.miner = new Miner(this, minerAddress);
    this.staking = new Staking(this, stakingAddress);
    this.farming = new Farming(this, farmingAddress);
    this.referral = new Referral(this, referralAddress);
    this.vault = new Vault(this, vaultAddress);

    console.log(`Loaded environment with ${this.amms.length} AMMs`);
  }

  async deploy() {
    console.log(`Begin deploy new environment...`);
    await setupAccounts({
      coordinator: 0.05 * wvs,
      insurance: 0.05 * wvs,
      staking: 0.05 * wvs,
      oracle: 0.01 * wvs,
      miner: 0.05 * wvs,
      orders: 0.05 * wvs,
      referral: 0.05 * wvs,
      farming: 0.05 * wvs,
      manager: 0.05 * wvs,
      housekeeper: 0.05 * wvs,
      prizes: 0.05 * wvs,
      nfts: 0.05 * wvs,
      collateral: 0.05 * wvs,
      vault: 0.05 * wvs,
    });

    this.seeds.coordinator = accounts.coordinator;
    this.seeds.insurance = accounts.insurance;
    this.seeds.staking = accounts.staking;
    this.seeds.oracle = accounts.oracle;
    this.seeds.miner = accounts.miner;
    this.seeds.orders = accounts.orders;
    this.seeds.referral = accounts.referral;
    this.seeds.farming = accounts.farming;
    this.seeds.manager = accounts.manager;
    this.seeds.housekeeper = accounts.housekeeper;
    this.seeds.prizes = accounts.prizes;
    this.seeds.nfts = accounts.nfts;
    this.seeds.collateral = accounts.collateral;
    this.seeds.vault = accounts.vault;

    if (this.isLocal) {
      await setupAccounts({
        assetHolder: 5 * wvs,
        neutrinoStaking: 0.15 * wvs,
        puzzleSwap: 0.15 * wvs,
        timer: 3 * wvs,
        vires: 0.15 * wvs,
        marketplace: 0.15 * wvs,
      });

      this.seeds.assetHolder = accounts.assetHolder;
      this.seeds.neutrinoStaking = accounts.neutrinoStaking;
      this.seeds.timer = accounts.timer;
      this.seeds.puzzleSwap = accounts.puzzleSwap;
      this.seeds.vires = accounts.vires;
      this.seeds.marketplace = accounts.marketplace;

      // Issue TSN and Neutrino assets
      //
      const tx1 = issue(
        {
          quantity: 1000000000 * decimals,
          name: "Neutrino",
          description: "Neutrino",
          decimals: 6,
        },
        this.seeds.assetHolder
      );

      const tx2 = issue(
        {
          quantity: 1000000000 * wvs,
          name: "Tsunami",
          description: "Tsunami",
          decimals: 8,
        },
        this.seeds.assetHolder
      );

      const tx3 = issue(
        {
          quantity: 1000000000 * decimals,
          name: "USDT",
          description: "USDT",
          decimals: 6,
        },
        this.seeds.assetHolder
      );

      const tx4 = issue(
        {
          quantity: 1000000000 * decimals,
          name: "USDC",
          description: "USDC",
          decimals: 6,
        },
        this.seeds.assetHolder
      );

      const iTx1 = await broadcast(tx1);
      const iTx2 = await broadcast(tx2);
      const iTx3 = await broadcast(tx3);
      const iTx4 = await broadcast(tx4);

      let p11 = deploy(
        "mock_neutrinoStaking.ride",
        3400000,
        this.seeds.neutrinoStaking,
        "Mock Neutrino Staking"
      );
      let p12 = deploy(
        "mock_swap.ride",
        3400000,
        this.seeds.puzzleSwap,
        "Mock Puzzle Swap"
      );
      let p13 = deploy(
        "mock_vires.ride",
        3400000,
        this.seeds.vires,
        "Mock Vires"
      );
      let p14 = deploy(
        "mock_nft.ride",
        3400000,
        this.seeds.marketplace,
        "Mock NFT Marketplace"
      );

      await Promise.all([
        waitForTx(iTx1.id),
        waitForTx(iTx2.id),
        waitForTx(iTx3.id),
        waitForTx(iTx4.id),
        p11,
        p12,
        p13,
        p14,
      ]);

      this.assets.tsn = iTx2.assetId;
      this.assets.neutrino = iTx1.assetId;
      this.assets.usdt = iTx3.assetId;
      this.assets.usdc = iTx4.assetId;

      this.addresses.neutrinoStaking = address(this.seeds.neutrinoStaking);

      console.log(`Initialized local mock env:`);
      console.log(`TSN Token: ${this.assets.tsn}`);
      console.log(`USDN Token: ${this.assets.neutrino}`);
      console.log(`USDN Staking: ${this.addresses.neutrinoStaking}`);
    }

    let p1 = deploy(
      "coordinator.ride",
      3400000,
      this.seeds.coordinator,
      "Coordinator"
    );
    let p2 = deploy(
      "insurance.ride",
      3400000,
      this.seeds.insurance,
      "Insurance Fund"
    );
    let p4 = deploy(
      "mining.ride",
      3400000,
      this.seeds.miner,
      "Miner",
      this.isLocal,
      address(this.seeds.timer)
    );
    let p5 = deploy(
      "orders2.ride",
      3400000,
      this.seeds.orders,
      "Orders",
      this.isLocal,
      address(this.seeds.timer)
    );
    let p6 = deploy(
      "referral.ride",
      3400000,
      this.seeds.referral,
      "Referral",
      this.isLocal,
      address(this.seeds.timer)
    );
    let p7 = deploy(
      "farming.ride",
      3400000,
      this.seeds.farming,
      "Farming",
      this.isLocal,
      address(this.seeds.timer)
    );
    let p8 = deploy(
      "rewards.ride",
      3400000,
      this.seeds.staking,
      "Staking",
      this.isLocal,
      address(this.seeds.timer)
    );
    let p9 = deploy(
      "manager.ride",
      3400000,
      this.seeds.manager,
      "Manager",
      this.isLocal,
      address(this.seeds.timer)
    );
    let p10 = deploy(
      "housekeeper.ride",
      3400000,
      this.seeds.housekeeper,
      "Housekeeper",
      this.isLocal,
      address(this.seeds.timer)
    );
    let p11 = deploy(
      "prizes.ride",
      3400000,
      this.seeds.prizes,
      "Prizes",
      this.isLocal,
      address(this.seeds.timer)
    );
    let p12 = deploy(
      "nfts.ride",
      3400000,
      this.seeds.nfts,
      "NFT Manager",
      this.isLocal,
      address(this.seeds.timer)
    );
    let p13 = deploy(
      "collateral.ride",
      3400000,
      this.seeds.collateral,
      "Collateral Manager",
      this.isLocal,
      address(this.seeds.timer)
    );
    let p14 = deploy(
      "vault.ride",
      3400000,
      this.seeds.vault,
      "Vault",
      this.isLocal,
      address(this.seeds.timer)
    );

    let period = Math.floor(new Date().getTime() / 1000 / 604800);

    let seedOracleTx = data(
      {
        data: [
          {
            key: `price_${period}_${this.assets.tsn}`,
            type: "integer",
            value: Math.round(4 * decimals),
          },
        ],
      },
      this.seeds.oracle
    );

    await broadcast(seedOracleTx);
    console.log(`Seed oracle in ${seedOracleTx.id}`);

    await Promise.all([
      p1,
      p2,
      p4,
      p5,
      p6,
      p7,
      p8,
      p9,
      p10,
      p11,
      p12,
      p13,
      p14,
      seedOracleTx,
    ]);

    let initTxs = [];

    // Init coordinator
    {
      console.log(`Setting admin...`);
      const addAdminTx = await invoke(
        {
          dApp: address(accounts.coordinator),
          functionName: "setAdmin",
          arguments: [publicKey(accounts.admin)],
        },
        this.seeds.admin
      );

      console.log(`setAdmin in ${addAdminTx.id}`);
      await waitForTx(addAdminTx.id);

      const setInsuranceFundTx = await invoke(
        {
          dApp: address(this.seeds.coordinator),
          functionName: "setInsuranceFund",
          arguments: [address(this.seeds.insurance)],
        },
        this.seeds.admin
      );

      console.log(`setInsuranceFund in ${setInsuranceFundTx.id}`);

      const setMinerTx = await invoke(
        {
          dApp: address(this.seeds.coordinator),
          functionName: "setLiquidityMiner",
          arguments: [address(this.seeds.miner)],
        },
        this.seeds.admin
      );

      console.log(`setLiquidityMiner in ${setMinerTx.id}`);

      const setOrdersTx = await invoke(
        {
          dApp: address(this.seeds.coordinator),
          functionName: "setOrders",
          arguments: [address(this.seeds.orders)],
        },
        this.seeds.admin
      );

      console.log(`setOrders in ${setOrdersTx.id}`);

      const setReferralTx = await invoke(
        {
          dApp: address(this.seeds.coordinator),
          functionName: "setReferral",
          arguments: [address(this.seeds.referral)],
        },
        this.seeds.admin
      );

      const setFarmingTx = await invoke(
        {
          dApp: address(this.seeds.coordinator),
          functionName: "setFarming",
          arguments: [address(this.seeds.farming)],
        },
        this.seeds.admin
      );

      console.log(`setFarming in ${setFarmingTx.id}`);

      const setQuoteAssetTx = await invoke(
        {
          dApp: address(this.seeds.coordinator),
          functionName: "setQuoteAsset",
          arguments: [this.assets.neutrino, this.addresses.neutrinoStaking],
        },
        this.seeds.admin
      );

      console.log(`setQuoteAsset in ${setQuoteAssetTx.id}`);

      const setGovAssetTx = await invoke(
        {
          dApp: address(this.seeds.coordinator),
          functionName: "setGovernanceAsset",
          arguments: [this.assets.tsn],
        },
        this.seeds.admin
      );

      console.log(`setGovernanceAsset in ${setGovAssetTx.id}`);

      const setStakingAddressTx = await invoke(
        {
          dApp: address(this.seeds.coordinator),
          functionName: "setStakingAddress",
          arguments: [address(this.seeds.staking)],
        },
        this.seeds.admin
      );

      console.log(`setStakingAddress in ${setStakingAddressTx.id}`);

      const setManagerAddressTx = await invoke(
        {
          dApp: address(this.seeds.coordinator),
          functionName: "setManager",
          arguments: [address(this.seeds.manager)],
        },
        this.seeds.admin
      );

      console.log(`setStakingAddress in ${setManagerAddressTx.id}`);

      const setHousekeeperAddressTx = await invoke(
        {
          dApp: address(this.seeds.coordinator),
          functionName: "setHousekeeper",
          arguments: [address(this.seeds.housekeeper)],
        },
        this.seeds.admin
      );

      console.log(`setHousekeeper in ${setHousekeeperAddressTx.id}`);

      const setPrizesAddressTx = await invoke(
        {
          dApp: address(this.seeds.coordinator),
          functionName: "setPrizes",
          arguments: [address(this.seeds.prizes)],
        },
        this.seeds.admin
      );

      console.log(`setPrizes in ${setPrizesAddressTx.id}`);

      const setNftManagerTx = await invoke(
        {
          dApp: address(this.seeds.coordinator),
          functionName: "setNftManager",
          arguments: [address(this.seeds.nfts)],
        },
        this.seeds.admin
      );

      console.log(`setNftManager in ${setNftManagerTx.id}`);

      const setCollateralManagerTx = await invoke(
        {
          dApp: address(this.seeds.coordinator),
          functionName: "setCollateralAddress",
          arguments: [address(this.seeds.collateral)],
        },
        this.seeds.admin
      );

      console.log(`setCollateralAddress in ${setCollateralManagerTx.id}`);

      const setExchangeManagerTx = await invoke(
        {
          dApp: address(this.seeds.coordinator),
          functionName: "setExchangeAddress",
          arguments: [address(this.seeds.puzzleSwap)],
        },
        this.seeds.admin
      );

      const setVaultTx = await invoke(
        {
          dApp: address(this.seeds.coordinator),
          functionName: "setVaultAddress",
          arguments: [address(this.seeds.vault)],
        },
        this.seeds.admin
      );

      console.log(`setVaultAddress in ${setExchangeManagerTx.id}`);

      initTxs.push(waitForTx(setInsuranceFundTx.id));
      initTxs.push(waitForTx(setQuoteAssetTx.id));
      initTxs.push(waitForTx(setGovAssetTx.id));
      initTxs.push(waitForTx(setStakingAddressTx.id));
      initTxs.push(waitForTx(setMinerTx.id));
      initTxs.push(waitForTx(setOrdersTx.id));
      initTxs.push(waitForTx(setReferralTx.id));
      initTxs.push(waitForTx(setFarmingTx.id));
      initTxs.push(waitForTx(setManagerAddressTx.id));
      initTxs.push(waitForTx(setHousekeeperAddressTx.id));
      initTxs.push(waitForTx(setPrizesAddressTx.id));
      initTxs.push(waitForTx(setNftManagerTx.id));
      initTxs.push(waitForTx(setCollateralManagerTx.id));
      initTxs.push(waitForTx(setExchangeManagerTx.id));
      initTxs.push(waitForTx(setVaultTx.id));
    }

    // Init insurance
    {
      const initInsuranceTx = await invoke(
        {
          dApp: address(this.seeds.insurance),
          functionName: "initialize",
          arguments: [address(this.seeds.coordinator)],
        },
        this.seeds.admin
      );

      initTxs.push(waitForTx(initInsuranceTx.id));
      console.log("Insurance initialized in " + initInsuranceTx.id);
    }

    // Init staking
    {
      const initStakingTx = await invoke(
        {
          dApp: address(this.seeds.staking),
          functionName: "initialize",
          arguments: [address(this.seeds.coordinator)],
        },
        this.seeds.admin
      );

      initTxs.push(waitForTx(initStakingTx.id));
      console.log("Staking initialized in " + initStakingTx.id);
    }

    // Init miner
    {
      const initMinerTx = await invoke(
        {
          dApp: address(this.seeds.miner),
          functionName: "initialize",
          arguments: [
            address(this.seeds.coordinator),
            address(this.seeds.oracle),
          ],
        },
        this.seeds.admin
      );

      initTxs.push(waitForTx(initMinerTx.id));
      console.log("Miner initialized in " + initMinerTx.id);
    }

    // Init orders
    {
      const initOrdersTx = await invoke(
        {
          dApp: address(this.seeds.orders),
          functionName: "initialize",
          arguments: [address(this.seeds.coordinator)],
        },
        this.seeds.admin
      );

      initTxs.push(waitForTx(initOrdersTx.id));
      console.log("Orders initialized in " + initOrdersTx.id);
    }

    // Init referral
    {
      const initReferralTx = await invoke(
        {
          dApp: address(this.seeds.referral),
          functionName: "initialize",
          arguments: [
            address(this.seeds.coordinator),
            0.2 * decimals, // 20% of fee goes to referrer
            address(this.seeds.puzzleSwap),
          ],
        },
        this.seeds.admin
      );

      initTxs.push(waitForTx(initReferralTx.id));
      console.log("Referral initialized in " + initReferralTx.id);
    }

    // Init farming
    {
      const initFarmingTx = await invoke(
        {
          dApp: address(this.seeds.farming),
          functionName: "initialize",
          arguments: [
            address(this.seeds.coordinator),
            address(this.seeds.puzzleSwap),
          ],
        },
        this.seeds.admin
      );

      initTxs.push(waitForTx(initFarmingTx.id));
      initTxs.push(this.supplyTsn(10000, address(this.seeds.puzzleSwap)));
      initTxs.push(this.supplyUsdn(10000, address(this.seeds.puzzleSwap)));
      console.log("Farming initialized in " + initFarmingTx.id);
    }

    // Init manager
    {
      const initManagerTx = await invoke(
        {
          dApp: address(this.seeds.manager),
          functionName: "initialize",
          arguments: [
            address(this.seeds.coordinator),
            address(this.seeds.vires),
            this.assets.neutrino,
            address(this.seeds.vires),
          ],
        },
        this.seeds.admin
      );

      initTxs.push(waitForTx(initManagerTx.id));
      console.log("Manager initialized in " + initManagerTx.id);
    }

    // Init housekeeper
    {
      const initHousekeeperTx = await invoke(
        {
          dApp: address(this.seeds.housekeeper),
          functionName: "initialize",
          arguments: [address(this.seeds.coordinator)],
        },
        this.seeds.admin
      );

      initTxs.push(waitForTx(initHousekeeperTx.id));
      console.log("Housekeeper initialized in " + initHousekeeperTx.id);
    }

    // Init prizes
    {
      const initPrizesTx = await invoke(
        {
          dApp: address(this.seeds.prizes),
          functionName: "initialize",
          arguments: [
            address(this.seeds.coordinator),
            publicKey(this.seeds.admin),
          ],
        },
        this.seeds.admin
      );

      initTxs.push(waitForTx(initPrizesTx.id));
      console.log("Prizes initialized in " + initPrizesTx.id);
    }

    // Init NFT Manager
    {
      const initNFTManagerTx = await invoke(
        {
          dApp: address(this.seeds.nfts),
          functionName: "initialize",
          arguments: [
            address(this.seeds.coordinator),
            address(this.seeds.marketplace),
          ],
        },
        this.seeds.admin
      );

      initTxs.push(waitForTx(initNFTManagerTx.id));
      console.log("NFT Manager initialized in " + initNFTManagerTx.id);
    }

    // Init Collateral Manager
    {
      const initCollateralManagerTx = await invoke(
        {
          dApp: address(this.seeds.collateral),
          functionName: "initialize",
          arguments: [
            address(this.seeds.coordinator),
            `${this.assets.usdt},${this.assets.usdc}`,
          ],
        },
        this.seeds.admin
      );

      initTxs.push(waitForTx(initCollateralManagerTx.id));
      console.log(
        "NFT Collateral manager initialized in " + initCollateralManagerTx.id
      );
    }

    // Init Vault
    {
      const initVaultTx = await invoke(
        {
          dApp: address(this.seeds.vault),
          functionName: "initialize",
          arguments: [address(this.seeds.coordinator)],
        },
        this.seeds.admin
      );

      initTxs.push(waitForTx(initVaultTx.id));
      console.log("Vault initialized in " + initVaultTx.id);
    }

    await Promise.all(initTxs);

    this.insurance = new Insurance(this);
    this.miner = new Miner(this);
    this.orders = new Orders(this);
    this.referral = new Referral(this);
    this.staking = new Staking(this);
    this.farming = new Farming(this);
    this.housekeeper = new Housekeeper(this);
    this.prizes = new Prizes(this);
    this.nfts = new NFTManager(this);
    this.vault = new Vault(this);

    console.log(`Environment deployed`);
  }

  async deployOrders() {
    if (!this.seeds.orders) {
      throw Error(`No seed for Orders contract`);
    }
    let coordinatorAddress =
      this.addresses.coordinator || address(this.seeds.coordinator);
    let ordersAddress = address(this.seeds.orders);
    let fee = 3400000;

    await this.ensureDeploymentFee(ordersAddress, fee);

    await deploy("orders2.ride", fee, this.seeds.orders, "Orders");

    let orders = await accountDataByKey(
      `k_orders_address`,
      coordinatorAddress
    ).then((x) => x && x.value);
    if (orders !== ordersAddress) {
      const setOrdersTx = await invoke(
        {
          dApp: coordinatorAddress,
          functionName: "setOrders",
          arguments: [ordersAddress],
        },
        this.seeds.admin
      );

      console.log(`setOrders in ${setOrdersTx.id}`);
    }

    let initialized = await accountDataByKey(
      `k_initialized`,
      ordersAddress
    ).then((x) => x && x.value);
    if (!initialized) {
      const initOrdersTx = await invoke(
        {
          dApp: ordersAddress,
          functionName: "initialize",
          arguments: [coordinatorAddress],
        },
        this.seeds.admin
      );

      await waitForTx(initOrdersTx.id);
      console.log("Orders initialized in " + initOrdersTx.id);
    }
  }

  async deployReferral(_fee) {
    if (!this.seeds.referral) {
      throw Error(`No seed for Referral contract`);
    }
    if (!_fee) {
      throw Error(`Fee not set`);
    }
    let coordinatorAddress =
      this.addresses.coordinator || address(this.seeds.coordinator);
    let referralAddress = address(this.seeds.referral);
    let fee = 3400000;

    await this.ensureDeploymentFee(referralAddress, fee);

    await deploy("referral.ride", fee, this.seeds.referral, "Referral");

    let referral = await accountDataByKey(
      `k_referral_address`,
      coordinatorAddress
    ).then((x) => x && x.value);
    if (referral !== referralAddress) {
      const setReferralTx = await invoke(
        {
          dApp: coordinatorAddress,
          functionName: "setReferral",
          arguments: [referralAddress],
        },
        this.seeds.admin
      );

      console.log(`setReferral in ${setReferralTx.id}`);
    }

    let initialized = await accountDataByKey(
      `k_initialized`,
      referralAddress
    ).then((x) => x && x.value);
    if (!initialized) {
      const initReferralTx = await invoke(
        {
          dApp: referralAddress,
          functionName: "initialize",
          arguments: [coordinatorAddress, Math.round(_fee * decimals)],
        },
        this.seeds.admin
      );

      await waitForTx(initReferralTx.id);
      console.log("Referral initialized in " + initReferralTx.id);
    }
  }

  async deployFarming() {
    if (!this.seeds.farming) {
      throw Error(`No seed for Farming contract`);
    }

    let coordinatorAddress =
      this.addresses.coordinator || address(this.seeds.coordinator);
    let farmingAddress = address(this.seeds.farming);
    let fee = 3400000;

    await this.ensureDeploymentFee(farmingAddress, fee);

    await deploy("farming.ride", fee, this.seeds.farming, "Farming");

    let farming = await accountDataByKey(
      `k_farming_address`,
      coordinatorAddress
    ).then((x) => x && x.value);
    if (farming !== farmingAddress) {
      const setFarmingTx = await invoke(
        {
          dApp: coordinatorAddress,
          functionName: "setFarming",
          arguments: [farmingAddress],
        },
        this.seeds.admin
      );

      console.log(`setFarming in ${setFarmingTx.id}`);
    }

    let initialized = await accountDataByKey(
      `k_initialized`,
      farmingAddress
    ).then((x) => x && x.value);
    if (!initialized) {
      const initFarmingTx = await invoke(
        {
          dApp: farmingAddress,
          functionName: "initialize",
          arguments: [coordinatorAddress, ""],
        },
        this.seeds.admin
      );

      await waitForTx(initFarmingTx.id);
      console.log("Farming initialized in " + initFarmingTx.id);
    }
  }

  async deployHousekeeper() {
    if (!this.seeds.housekeeper) {
      throw Error(`No seed for Housekeeper contract`);
    }

    let coordinatorAddress =
      this.addresses.coordinator || address(this.seeds.coordinator);
    let housekeeperAddress = address(this.seeds.housekeeper);
    let fee = 3400000;

    await this.ensureDeploymentFee(housekeeperAddress, fee);

    await deploy(
      "housekeeper.ride",
      fee,
      this.seeds.housekeeper,
      "Housekeeper"
    );

    let housekeeper = await accountDataByKey(
      `k_housekeeper_address`,
      coordinatorAddress
    ).then((x) => x && x.value);
    if (housekeeper !== housekeeperAddress) {
      const setHousekeeperTx = await invoke(
        {
          dApp: coordinatorAddress,
          functionName: "setHousekeeper",
          arguments: [housekeeperAddress],
        },
        this.seeds.admin
      );

      console.log(`setHousekeeper in ${setHousekeeperTx.id}`);
    }

    let initialized = await accountDataByKey(
      `k_initialized`,
      housekeeperAddress
    ).then((x) => x && x.value);
    if (!initialized) {
      const initHousekeeperTx = await invoke(
        {
          dApp: housekeeperAddress,
          functionName: "initialize",
          arguments: [coordinatorAddress],
        },
        this.seeds.admin
      );

      await waitForTx(initHousekeeperTx.id);
      console.log("Housekeeper initialized in " + initHousekeeperTx.id);
    }
  }

  async deployPrizes(rewarderPublicKey) {
    if (!this.seeds.prizes) {
      throw Error(`No seed for Prizes contract`);
    }

    if (!rewarderPublicKey) {
      throw Error(`No rewarder public key`);
    }

    let coordinatorAddress =
      this.addresses.coordinator || address(this.seeds.coordinator);
    let prizesAddress = address(this.seeds.prizes);
    let fee = 3400000;

    await this.ensureDeploymentFee(prizesAddress, fee);

    await deploy("prizes.ride", fee, this.seeds.prizes, "Prizes");

    let prizes = await accountDataByKey(
      `k_prizes_address`,
      coordinatorAddress
    ).then((x) => x && x.value);
    if (prizes !== prizesAddress) {
      const setPrizesTx = await invoke(
        {
          dApp: coordinatorAddress,
          functionName: "setPrizes",
          arguments: [prizesAddress],
        },
        this.seeds.admin
      );

      console.log(`setPrizes in ${setPrizesTx.id}`);
    }

    let initialized = await accountDataByKey(
      `k_initialized`,
      prizesAddress
    ).then((x) => x && x.value);
    if (!initialized) {
      const initPrizesTx = await invoke(
        {
          dApp: prizesAddress,
          functionName: "initialize",
          arguments: [coordinatorAddress, rewarderPublicKey],
        },
        this.seeds.admin
      );

      await waitForTx(initPrizesTx.id);
      console.log("Prizes initialized in " + initPrizesTx.id);
    }
  }

  async deployVault() {
    if (!this.seeds.vault) {
      throw Error(`No seed for Vault contract`);
    }

    let coordinatorAddress =
      this.addresses.coordinator || address(this.seeds.coordinator);
    let vaultAddress = address(this.seeds.vault);
    let fee = 3400000;

    await this.ensureDeploymentFee(vaultAddress, fee);

    await deploy("vault.ride", fee, this.seeds.vault, "Vault");

    let vault = await accountDataByKey(
      `k_vault_address`,
      coordinatorAddress
    ).then((x) => x && x.value);
    if (vault !== vaultAddress) {
      const setVaultTx = await invoke(
        {
          dApp: coordinatorAddress,
          functionName: "setVaultAddress",
          arguments: [vaultAddress],
        },
        this.seeds.admin
      );

      console.log(`setVaultAddress in ${setVaultTx.id}`);
    }

    let initialized = await accountDataByKey(
      `k_initialized`,
      vaultAddress
    ).then((x) => x && x.value);
    if (!initialized) {
      const initVaultTx = await invoke(
        {
          dApp: vaultAddress,
          functionName: "initialize",
          arguments: [coordinatorAddress],
        },
        this.seeds.admin
      );

      await waitForTx(initVaultTx.id);
      console.log("Vault initialized in " + initVaultTx.id);
    }
  }

  async deployCollateral(exchangeAddress, whitelist) {
    if (!this.seeds.collateral) {
      throw Error(`No seed for Collateral contract`);
    }

    if (!exchangeAddress) {
      throw Error(`No exchangeAddress`);
    }

    if (!whitelist.length) {
      throw Error(`No whitelist`);
    }

    let coordinatorAddress =
      this.addresses.coordinator || address(this.seeds.coordinator);
    let collateralAddress = address(this.seeds.collateral);
    let fee = 3400000;

    await this.ensureDeploymentFee(collateralAddress, fee);

    await deploy(
      "collateral.ride",
      fee,
      this.seeds.collateral,
      "Collateral Manager"
    );

    let collateral = await accountDataByKey(
      `k_collateral_address`,
      coordinatorAddress
    ).then((x) => x && x.value);
    if (collateral !== collateralAddress) {
      const setCollateralTx = await invoke(
        {
          dApp: coordinatorAddress,
          functionName: "setCollateralAddress",
          arguments: [collateralAddress],
        },
        this.seeds.admin
      );

      console.log(`setCollateralAddress in ${setCollateralTx.id}`);

      const setExchangeTx = await invoke(
        {
          dApp: coordinatorAddress,
          functionName: "setExchangeAddress",
          arguments: [exchangeAddress],
        },
        this.seeds.admin
      );

      console.log(`setExchangeAddress in ${setExchangeTx.id}`);
    }

    let initialized = await accountDataByKey(
      `k_initialized`,
      collateralAddress
    ).then((x) => x && x.value);
    if (!initialized) {
      const initCollateralTx = await invoke(
        {
          dApp: collateralAddress,
          functionName: "initialize",
          arguments: [coordinatorAddress, whitelist.join(",")],
        },
        this.seeds.admin
      );

      await waitForTx(initCollateralTx.id);
      console.log("Collateral Manager initialized in " + initCollateralTx.id);
    }
  }

  async deployNfts(marketplaceAddress) {
    if (!this.seeds.nfts) {
      throw Error(`No seed for NFT Manager contract`);
    }

    if (!marketplaceAddress) {
      throw Error(`No marketplace address`);
    }

    let coordinatorAddress =
      this.addresses.coordinator || address(this.seeds.coordinator);
    let nftsAddress = address(this.seeds.nfts);
    let fee = 3400000;

    await this.ensureDeploymentFee(nftsAddress, fee);

    await deploy("nfts.ride", fee, this.seeds.nfts, "NFT Manager");

    let nfts = await accountDataByKey(
      `k_nft_manager_address`,
      coordinatorAddress
    ).then((x) => x && x.value);
    if (nfts !== nftsAddress) {
      const setNftManagerTx = await invoke(
        {
          dApp: coordinatorAddress,
          functionName: "setNftManager",
          arguments: [nftsAddress],
        },
        this.seeds.admin
      );

      console.log(`setNftManager in ${setNftManagerTx.id}`);
    }

    let initialized = await accountDataByKey(`k_initialized`, nftsAddress).then(
      (x) => x && x.value
    );
    if (!initialized) {
      const initNftsTx = await invoke(
        {
          dApp: nftsAddress,
          functionName: "initialize",
          arguments: [coordinatorAddress, marketplaceAddress],
        },
        this.seeds.admin
      );

      await waitForTx(initNftsTx.id);
      console.log("NFT Manager initialized in " + initNftsTx.id);
    }
  }

  async deployManager(_vires, _usdn, _viresUsdnVires) {
    if (!this.seeds.manager) {
      throw Error(`No seed for Manager contract`);
    }

    if (!_vires || !_usdn || !_viresUsdnVires) {
      throw Error(`Invalid deployManager params`);
    }

    let coordinatorAddress =
      this.addresses.coordinator || address(this.seeds.coordinator);
    let managerAddress = address(this.seeds.manager);
    let fee = 3400000;

    await this.ensureDeploymentFee(managerAddress, fee);

    await deploy("manager.ride", fee, this.seeds.manager, "Manager");

    let manager = await accountDataByKey(
      `k_manager_address`,
      coordinatorAddress
    ).then((x) => x && x.value);
    if (manager !== managerAddress) {
      const setManagerTx = await invoke(
        {
          dApp: coordinatorAddress,
          functionName: "setManager",
          arguments: [managerAddress],
        },
        this.seeds.admin
      );

      console.log(`setManager in ${setManagerTx.id}`);
    }

    let initialized = await accountDataByKey(
      `k_initialized`,
      managerAddress
    ).then((x) => x && x.value);
    if (!initialized) {
      const initManagerTx = await invoke(
        {
          dApp: managerAddress,
          functionName: "initialize",
          arguments: [coordinatorAddress, _vires, _usdn, _viresUsdnVires],
        },
        this.seeds.admin
      );

      await waitForTx(initManagerTx.id);
      console.log("Manager initialized in " + initManagerTx.id);
    }
  }

  async deployAmm(_liquidity, _price, options = {}) {
    await setupAccounts({
      amm: 0.15 * wvs,
    });

    if (!this.seeds.amms) {
      this.seeds.amms = {};
    }

    const ammSeed = accounts.amm;
    this.seeds.amms[address(accounts.amm)] = ammSeed;

    let seedOracleTx = data(
      {
        data: [
          {
            key: "price",
            type: "integer",
            value: Math.round(_price * decimals),
          },
        ],
      },
      this.seeds.oracle
    );

    await broadcast(seedOracleTx);
    console.log(`Seed AMM oracle in ${seedOracleTx.id}`);

    let p3 = deploy(
      "vAMM2.ride",
      7000000,
      ammSeed,
      "vAMM",
      this.isLocal,
      address(this.seeds.timer)
    );

    const addAmmTx = await invoke(
      {
        dApp: address(this.seeds.coordinator),
        functionName: "addAmm",
        arguments: [address(ammSeed), ""],
      },
      this.seeds.admin
    );

    console.log(`addAmm in ${addAmmTx.id}`);

    await Promise.all([p3, waitForTx(addAmmTx.id), waitForTx(seedOracleTx.id)]);

    {
      const initTx = invokeScript(
        {
          dApp: address(ammSeed),
          call: {
            function: "initialize",
            args: [
              { type: "integer", value: Math.round(_liquidity * decimals) }, // _quoteAssetReserve
              {
                type: "integer",
                value: Math.round((_liquidity / _price) * decimals),
              }, // _baseAssetReserve ~ 55 USDN / Waves (Optimistic!)
              { type: "integer", value: options.fundingPeriodSeconds || 60 }, // _fundingPeriod = 1 minute
              {
                type: "integer",
                value: Math.round((options.initMarginRatio || 0.3) * decimals),
              }, // _initMarginRatio = 5%
              {
                type: "integer",
                value: Math.round(
                  (options.maintenanceMarginRatio || 0.085) * decimals
                ),
              }, // _maintenanceMarginRatio = 10%
              {
                type: "integer",
                value: Math.round(
                  (options.liquidationFeeRatio || 0.01) * decimals
                ),
              }, // _liquidationFeeRatio = 1%
              {
                type: "integer",
                value: Math.round((options.fee || 0.01) * decimals),
              }, // _fee 1%
              { type: "string", value: address(this.seeds.oracle) }, // Oracle address
              { type: "string", value: "price" }, // Oracle key
              { type: "string", value: address(this.seeds.coordinator) }, // Coordinator address,
              {
                type: "integer",
                value: Math.round((options.spreadLimit || 0.1) * decimals),
              }, // _spreadLimit 10%
              {
                type: "integer",
                value: Math.round((options.maxPriceImpact || 0.08) * decimals),
              }, // _maxPriceImpact 8%
              {
                type: "integer",
                value: Math.round(
                  (options.partialLiquidationRatio || 0.15) * decimals
                ),
              }, // _partialLiquidationRatio 15%
              {
                type: "integer",
                value: Math.round((options.maxPriceSpread || 0.4) * decimals),
              }, // _maxPriceSpread 40%
              {
                type: "integer",
                value: Math.round(
                  (options.maxOpenNotional || 100_000_000) * decimals
                ),
              }, // _maxOpenNotional 100,000,000
            ],
          },
        },
        this.seeds.admin
      );

      await broadcast(initTx);
      await waitForTx(initTx.id);

      console.log("vAMM initialized in " + initTx.id);
    }

    const amm = new AMM(this, address(ammSeed));
    return amm;
  }

  async addAmm(_amm) {
    const addAmmTx = await invoke(
      {
        dApp: address(this.seeds.coordinator),
        functionName: "addAmm",
        arguments: [address(_amm), ""],
      },
      this.seeds.admin
    );

    await waitForTx(addAmmTx.id);
    console.log(`addAmm in ${addAmmTx.id}`);
    return addAmmTx;
  }

  async supplyUsdn(_amount, _recipient) {
    let amount = _amount * decimals;

    let tx = await broadcast(
      transfer(
        {
          recipient: _recipient,
          amount,
          assetId: this.assets.neutrino,
        },
        this.seeds.assetHolder
      )
    );

    await waitForTx(tx.id);
    return tx;
  }

  async supplyUsdt(_amount, _recipient) {
    let amount = _amount * decimals;

    let tx = await broadcast(
      transfer(
        {
          recipient: _recipient,
          amount,
          assetId: this.assets.usdt,
        },
        this.seeds.assetHolder
      )
    );

    await waitForTx(tx.id);
    return tx;
  }

  async supplyUsdc(_amount, _recipient) {
    let amount = _amount * decimals;

    let tx = await broadcast(
      transfer(
        {
          recipient: _recipient,
          amount,
          assetId: this.assets.usdc,
        },
        this.seeds.assetHolder
      )
    );

    await waitForTx(tx.id);
    return tx;
  }

  async supplyTsn(_amount, _recipient) {
    let amount = _amount * wvs;

    let tx = await broadcast(
      transfer(
        {
          recipient: _recipient,
          amount,
          assetId: this.assets.tsn,
        },
        this.seeds.assetHolder
      )
    );

    await waitForTx(tx.id);
    return tx;
  }

  async fundAccounts(request) {
    await Promise.all(
      Object.keys(request).map((r) => this.supplyUsdn(request[r], address(r)))
    );
  }

  async fundAccountsUsdt(request) {
    await Promise.all(
      Object.keys(request).map((r) => this.supplyUsdt(request[r], address(r)))
    );
  }

  async fundAccountsUsdc(request) {
    await Promise.all(
      Object.keys(request).map((r) => this.supplyUsdc(request[r], address(r)))
    );
  }

  async setTime(_timestamp) {
    if (!this.isLocal) {
      throw "Can set time only in local env";
    }

    let setTimerTx = data(
      {
        data: [
          {
            key: "timestamp",
            type: "integer",
            value: _timestamp,
          },
        ],
      },
      this.seeds.timer
    );

    await broadcast(setTimerTx);
    await waitForTx(setTimerTx.id);

    console.log(`Set new time in ${setTimerTx.id}`);
    return setTimerTx;
  }

  async setOracleAssetPrice(_assetId, _price) {
    let period = Math.floor(new Date().getTime() / 1000 / 604800);

    let seedOracleTx = data(
      {
        data: [
          {
            key: `price_${period}_${_assetId}`,
            type: "integer",
            value: Math.round(_price * decimals),
          },
        ],
      },
      this.seeds.oracle
    );

    await broadcast(seedOracleTx);
    await waitForTx(seedOracleTx.id);
    console.log(`Updated oracle in ${seedOracleTx.id}`);
  }

  async ensureDeploymentFee(address, fee) {
    const contractBalance = await balance(address);
    const toAdd = contractBalance >= fee ? 0 : fee - contractBalance;
    if (toAdd > 0) {
      let ttx = await broadcast(
        transfer(
          {
            recipient: address,
            amount: toAdd,
          },
          this.seeds.admin
        )
      );

      console.log(`Added ${toAdd / wvs} WAVES to ${address} balance`);

      await waitForTx(ttx.id);
    }
  }

  async upgradeContract(file, address, fee) {
    if (await shouldUpgrade(file, address)) {
      console.log(`Upgrading contract at ${address} with ${file}`);
      await this.ensureDeploymentFee(address, fee);

      const tx = await upgrade(file, address, fee, this.seeds.admin);
      if (tx) {
        console.log(`Upgraded contract at ${address} in ${tx.id}`);
        return tx;
      }
    } else {
      console.log(`Already deployed ${file} to ${address}`);
    }
  }

  async forceSetKey(address, key, value) {
    let fee = 500000;
    await this.ensureDeploymentFee(address, fee);
    let senderPublicKey = await publicKeyByAddress(address);
    const tx = data(
      {
        senderPublicKey,
        fee,
        data: [
          {
            key,
            value,
          },
        ],
      },
      this.seeds.admin
    );

    await broadcast(tx);
    await waitForTx(tx.id);

    console.log(`Updated key ${key} to ${value} on ${address} in tx ${tx.id}`);
    return tx;
  }

  async clearAdminScript() {
    const tx = await clearScript(this.seeds.admin);
    console.log(`Cleared admin script at ${address} in ${tx.id}`);
  }

  async upgradeCoordinator() {
    const tx = await this.upgradeContract(
      "coordinator.ride",
      this.addresses.coordinator,
      3400000
    );
    if (tx) {
      console.log(`Upgraded coordinator in ${tx.id}`);
    }
  }
}

class AMM {
  constructor(e, address, sender) {
    this.e = e;
    this.sender = sender;
    this.address = address;
  }

  as(_sender) {
    return new AMM(this.e, this.address, _sender);
  }

  withAssetId(_assetId) {
    let amm = new AMM(this.e, this.address, this.sender);
    amm.assetId = _assetId;
    return amm;
  }

  async upgrade() {
    console.log(`Upgrading AMM ${this.address}`);
    return this.e.upgradeContract("vAMM2.ride", this.address, 7000000);
  }

  async migrateLiquidity() {
    let tx = await invoke(
      {
        dApp: this.address,
        functionName: "migrateLiquidity",
        arguments: [],
        payment: [],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }

  async updateSettings(update) {
    console.log(`Updating settings for ${this.address}`);

    const initMarginRatio =
      update.initMarginRatio ||
      (await accountDataByKey("k_initMarginRatio", this.address).then(
        (x) => x && x.value
      ));
    const mmr =
      update.mmr ||
      (await accountDataByKey("k_mmr", this.address).then((x) => x && x.value));
    const liquidationFeeRatio =
      update.liquidationFeeRatio ||
      (await accountDataByKey("k_liquidationFeeRatio", this.address).then(
        (x) => x && x.value
      ));
    const fundingPeriod =
      update.fundingPeriod ||
      (await accountDataByKey("k_fundingPeriod", this.address).then(
        (x) => x && x.value
      ));
    const fee =
      update.fee ||
      (await accountDataByKey("k_fee", this.address).then((x) => x && x.value));
    const spreadLimit =
      update.spreadLimit ||
      (await accountDataByKey("k_spreadLimit", this.address).then(
        (x) => x && x.value
      ));
    const maxPriceImpact =
      update.maxPriceImpact ||
      (await accountDataByKey("k_maxPriceImpact", this.address).then(
        (x) => x && x.value
      ));
    const partialLiquidationRatio =
      update.partialLiquidationRatio ||
      (await accountDataByKey("k_partLiquidationRatio", this.address).then(
        (x) => x && x.value
      ));
    const maxPriceSpread =
      update.maxPriceSpread ||
      (await accountDataByKey("k_maxPriceSpread", this.address).then(
        (x) => x && x.value
      ));

    const changeSettingsTx = invokeScript(
      {
        dApp: this.address,
        call: {
          function: "changeSettings",
          args: [
            { type: "integer", value: initMarginRatio },
            { type: "integer", value: mmr },
            { type: "integer", value: liquidationFeeRatio },
            { type: "integer", value: fundingPeriod },
            { type: "integer", value: fee },
            { type: "integer", value: spreadLimit },
            { type: "integer", value: maxPriceImpact },
            { type: "integer", value: partialLiquidationRatio },
            { type: "integer", value: maxPriceSpread },
          ],
        },
        payment: [],
      },
      this.e.seeds.admin
    );

    await broadcast(changeSettingsTx);
    await waitForTx(changeSettingsTx.id);

    return changeSettingsTx;
  }

  async increasePosition(
    _amount,
    _direction,
    _leverage,
    _minBaseAssetAmount = 0,
    _link = "",
    _artifact
  ) {
    let payment = [
      {
        amount: _amount * decimals,
        assetId: this.assetId || this.e.assets.neutrino,
      },
    ];
    if (_artifact) {
      payment.push({
        amount: 1,
        assetId: _artifact,
      });
    }
    const openPositionTx = invokeScript(
      {
        dApp: address(this.e.seeds.amms[this.address]),
        call: {
          function: "increasePosition",
          args: [
            { type: "integer", value: _direction }, // _direction = LONG
            { type: "integer", value: _leverage * decimals }, // _leverage = 3
            { type: "integer", value: _minBaseAssetAmount * decimals }, // _minBaseAssetAmount = 0.1 WAVES
            { type: "string", value: _link || "" },
          ],
        },
        payment,
      },
      this.sender
    );

    await broadcast(openPositionTx);
    await waitForTx(openPositionTx.id);

    return openPositionTx;
  }

  async decreasePosition(_amount, _leverage, _minBaseAssetAmount) {
    const decreasePositionTx = invokeScript(
      {
        dApp: address(this.e.seeds.amms[this.address]),
        call: {
          function: "decreasePosition",
          args: [
            { type: "integer", value: Math.round(_amount * decimals) }, // _amount = 3
            { type: "integer", value: Math.round(_leverage * decimals) }, // _leverage = 3
            {
              type: "integer",
              value: Math.round(_minBaseAssetAmount * decimals),
            }, // _minBaseAssetAmount = 0.1 WAVES
          ],
        },
      },
      this.sender
    );

    await broadcast(decreasePositionTx);
    await waitForTx(decreasePositionTx.id);

    return decreasePositionTx;
  }

  async addMargin(_amount) {
    const addMarginTx = invokeScript(
      {
        dApp: address(this.e.seeds.amms[this.address]),
        call: {
          function: "addMargin",
          args: [],
        },
        payment: [
          {
            amount: _amount * decimals,
            assetId: this.assetId || this.e.assets.neutrino,
          },
        ],
      },
      this.sender
    );

    await broadcast(addMarginTx);
    await waitForTx(addMarginTx.id);

    return addMarginTx;
  }

  async removeMargin(_amount) {
    const removeMarginTx = invokeScript(
      {
        dApp: address(this.e.seeds.amms[this.address]),
        call: {
          function: "removeMargin",
          args: [{ type: "integer", value: _amount * decimals }],
        },
      },
      this.sender
    );

    await broadcast(removeMarginTx);
    await waitForTx(removeMarginTx.id);

    return removeMarginTx;
  }

  async closePosition(_amount, _minQuoteAssetAmount = 0) {
    if (!_amount) {
      let trader = address(this.sender);
      let dApp = address(this.e.seeds.amms[this.address]);

      _amount = await accountDataByKey(`k_positionSize_${trader}`, dApp).then(
        (x) => x.value
      );
      _amount = Math.abs(_amount);
    } else {
      _amount = Math.round(_amount * decimals);
    }
    const closePositionTx = invokeScript(
      {
        dApp: address(this.e.seeds.amms[this.address]),
        call: {
          function: "closePosition",
          args: [
            { type: "integer", value: _amount },
            {
              type: "integer",
              value: Math.round(_minQuoteAssetAmount * decimals),
            },
          ],
        },
      },
      this.sender
    );

    await broadcast(closePositionTx);
    await waitForTx(closePositionTx.id);

    return closePositionTx;
  }

  async liquidate(_trader) {
    const liquidatePositionTx = invokeScript(
      {
        dApp: address(this.e.seeds.amms[this.address]),
        call: {
          function: "liquidate",
          args: [{ type: "string", value: address(_trader) }],
        },
      },
      this.sender
    );

    console.log("Position liquidated by " + liquidatePositionTx.id);

    await broadcast(liquidatePositionTx);
    await waitForTx(liquidatePositionTx.id);

    return liquidatePositionTx;
  }

  async getNextFundingTimestamp() {
    let nextFundingBlockTsV = await accountDataByKey(
      "k_nextFundingBlockMinTimestamp",
      this.address
    );
    let nextFundingBlockTs = nextFundingBlockTsV.value;
    return nextFundingBlockTs;
  }

  async awaitNextFunding() {
    let nextFundingBlockTs = await this.getNextFundingTimestamp();

    while (new Date().getTime() <= nextFundingBlockTs) {
      await wait(500);
    }

    await waitNBlocks(1);
  }

  async payFunding() {
    const payFundingTx = invokeScript(
      {
        dApp: address(this.e.seeds.amms[this.address]),
        call: {
          function: "payFunding",
          args: [],
        },
      },
      this.e.seeds.admin
    );

    console.log("Paid funding tx: " + payFundingTx.id);

    await broadcast(payFundingTx);
    await waitForTx(payFundingTx.id);

    return payFundingTx;
  }

  async syncTerminalPriceToOracle() {
    const payFundingTx = invokeScript(
      {
        dApp: address(this.e.seeds.amms[this.address]),
        call: {
          function: "syncTerminalPriceToOracle",
          args: [],
        },
      },
      this.e.seeds.admin
    );

    console.log("Adjust peg tx: " + payFundingTx.id);

    await broadcast(payFundingTx);
    await waitForTx(payFundingTx.id);

    return payFundingTx;
  }

  async getPositionInfo(_trader) {
    let trader = address(_trader);
    let dApp = address(this.e.seeds.amms[this.address]);

    let size = await accountDataByKey(`k_positionSize_${trader}`, dApp).then(
      (x) => x.value
    );
    let margin = await accountDataByKey(
      `k_positionMargin_${trader}`,
      dApp
    ).then((x) => x.value);
    let openNotional = await accountDataByKey(
      `k_positionOpenNotional_${trader}`,
      dApp
    ).then((x) => x.value);

    return {
      size,
      margin,
      openNotional,
    };
  }

  async getBorrow(_trader) {
    let trader = address(_trader);
    let dApp = address(this.e.seeds.amms[this.address]);

    const invokeTx = invokeScript(
      {
        dApp: dApp,
        call: {
          function: "view_getBorrowedByTrader",
          args: [trader],
        },
      },
      this.e.seeds.admin
    );

    try {
      await broadcast(invokeTx);
    } catch (e) {
      let { message } = JSON.parse(JSON.stringify(e));
      let parts = message
        .replace("Error while executing account-script: ", "")
        .split(",");
      let amount = parseInt(parts[0]);
      let assetId = parts[1];

      return {
        amount,
        assetId,
      };
    }
  }

  async totalPositionInfo() {
    let dApp = address(this.e.seeds.amms[this.address]);

    let totalSize = await accountDataByKey(`k_totalPositionSize`, dApp).then(
      (x) => x.value
    );
    let totalLong = await accountDataByKey(
      `k_totalLongPositionSize`,
      dApp
    ).then((x) => x.value);
    let totalShort = await accountDataByKey(
      `k_totalShortPositionSize`,
      dApp
    ).then((x) => x.value);

    return {
      totalSize,
      totalLong,
      totalShort,
    };
  }

  async getMarketPrice() {
    let dApp = address(this.e.seeds.amms[this.address]);
    let quote = await accountDataByKey(`k_qtAstR`, dApp).then((x) => x.value);
    let quoteW = await accountDataByKey(`k_qtAstW`, dApp).then((x) =>
      x ? x.value : decimals
    );
    let base = await accountDataByKey(`k_bsAstR`, dApp).then((x) => x.value);
    let baseW = await accountDataByKey(`k_bsAstW`, dApp).then((x) =>
      x ? x.value : decimals
    );

    let rawQ = (quote * quoteW) / decimals;
    let rawB = (base * baseW) / decimals;
    return Number.parseFloat((rawQ / rawB).toFixed(4));
  }

  async getBalance() {
    let dApp = address(this.e.seeds.amms[this.address]);
    let quote = await accountDataByKey(`k_balance`, dApp).then((x) => x.value);

    return Number.parseFloat((quote / decimals).toFixed(4));
  }

  async syncOraclePriceWithMarketPrice() {
    let price = await this.getMarketPrice();

    let seedOracleTx = data(
      {
        data: [
          {
            key: "price",
            type: "integer",
            value: Math.round(price * decimals),
          },
        ],
      },
      this.e.seeds.oracle
    );

    await broadcast(seedOracleTx);
    await waitForTx(seedOracleTx.id);

    console.log(`Sync Market and Oracle price in ${seedOracleTx.id}`);
    return seedOracleTx;
  }

  async setOraclePrice(_price) {
    let seedOracleTx = data(
      {
        data: [
          {
            key: "price",
            type: "integer",
            value: Math.round(_price * decimals),
          },
        ],
      },
      this.e.seeds.oracle
    );

    await broadcast(seedOracleTx);
    await waitForTx(seedOracleTx.id);

    console.log(`Set Oracle price in ${seedOracleTx.id}`);
    return seedOracleTx;
  }

  async getPositionActualData(_trader) {
    let trader = address(_trader);

    const invokeTx = invokeScript(
      {
        dApp: address(this.e.seeds.amms[this.address]),
        call: {
          function: "view_calcRemainMarginWithFundingPayment",
          args: [{ type: "string", value: trader }],
        },
      },
      this.e.seeds.admin
    );

    try {
      await broadcast(invokeTx);
    } catch (e) {
      let { message } = JSON.parse(JSON.stringify(e));
      let parts = message
        .replace("Error while executing account-script: ", "")
        .split(",");
      let margin = Number.parseFloat((parseInt(parts[0]) / 10 ** 6).toFixed(4));
      let fundingPayment = Number.parseFloat(
        (parseInt(parts[1]) / 10 ** 6).toFixed(4)
      );
      let marginRatio = Number.parseFloat(
        (parseInt(parts[2]) / 10 ** 6).toFixed(4)
      );
      let unrealizedPnl = Number.parseFloat(
        (parseInt(parts[3]) / 10 ** 6).toFixed(4)
      );
      let badDebt = Number.parseFloat(
        (parseInt(parts[4]) / 10 ** 6).toFixed(4)
      );
      let positionalNotional = Number.parseFloat(
        (parseInt(parts[5]) / 10 ** 6).toFixed(4)
      );
      let info = await this.getPositionInfo(_trader);

      return {
        margin,
        fundingPayment,
        marginRatio,
        unrealizedPnl,
        badDebt,
        positionalNotional,
        size: info.size / decimals,
        openNotional: info.openNotional / decimals,
        leverage: info.openNotional / decimals / (info.margin / decimals),
      };
    }
  }

  async getPegAdjustCost(_price) {
    const invokeTx = invokeScript(
      {
        dApp: address(this.e.seeds.amms[this.address]),
        call: {
          function: "view_getPegAdjustCost",
          args: [{ type: "integer", value: Math.round(_price * decimals) }],
        },
      },
      this.e.seeds.admin
    );

    try {
      console.log(JSON.stringify(invokeTx));
      await broadcast(invokeTx);
    } catch (e) {
      let { message } = JSON.parse(JSON.stringify(e));
      let parts = message
        .replace("Error while executing account-script: ", "")
        .split(",");
      let cost = Number.parseFloat((parseInt(parts[0]) / 10 ** 6).toFixed(4));

      // if (!cost) {
      //    throw new Error(message)
      //}

      console.log(message);

      return cost;
    }
  }

  async getTerminalAmmPrice() {
    const invokeTx = invokeScript(
      {
        dApp: address(this.e.seeds.amms[this.address]),
        call: {
          function: "view_getTerminalAmmPrice",
          args: [],
        },
      },
      this.e.seeds.admin
    );

    try {
      await broadcast(invokeTx);
    } catch (e) {
      let { message } = JSON.parse(JSON.stringify(e));
      let parts = message
        .replace("Error while executing account-script: ", "")
        .split(",");
      console.log(message);
      let cost = Number.parseFloat((parseInt(parts[0]) / 10 ** 6).toFixed(4));

      // if (!cost) {
      //    throw new Error(message)
      //}

      console.log(message);

      return cost;
    }
  }
}

class Insurance {
  constructor(e, address) {
    this.e = e;
    this.address = address;
  }

  async upgrade() {
    console.log(`Upgrading Insurance ${this.address}`);
    return this.e.upgradeContract("insurance.ride", this.address, 3700000);
  }

  async migrateLiquidity() {
    let tx = await invoke(
      {
        dApp: this.address,
        functionName: "migrateLiquidity",
        arguments: [],
        payment: [],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }

  async deposit(_amount) {
    let amount = _amount * decimals;
    await this.e.supplyUsdn(_amount, address(this.e.seeds.admin));

    let tx = await invoke(
      {
        dApp: address(this.e.seeds.insurance),
        functionName: "deposit",
        payment: { amount, assetId: this.e.assets.neutrino },
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }

  async getBalance() {
    let dApp = address(this.e.seeds.insurance);
    let balance = await accountDataByKey(`k_insurance`, dApp).then(
      (x) => x.value
    );

    return Number.parseFloat((balance / 10 ** 6).toFixed(4));
  }
}

class Miner {
  constructor(e, address, sender) {
    this.e = e;
    this.address = address;
    this.sender = sender;
  }

  as(_sender) {
    return new Miner(this.e, this.address, _sender);
  }

  async upgrade() {
    console.log(`Upgrading Miner ${this.address}`);
    return this.e.upgradeContract("mining.ride", this.address, 3700000);
  }

  async notifyFees(_trader, _fee) {
    let fee = _fee * decimals;
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.miner),
        functionName: "notifyFees",
        arguments: [_trader, fee],
      },
      this.sender
    );

    await waitForTx(tx.id);
    return tx;
  }

  async notifyNotional(_trader, _notional) {
    let notional = _notional * decimals;
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.miner),
        functionName: "notifyNotional",
        arguments: [_trader, notional],
      },
      this.sender
    );

    await waitForTx(tx.id);
    return tx;
  }

  async attachRewardAsset(_assetId, _maxAmountPerPeriod) {
    let maxAmountPerPeriod = _maxAmountPerPeriod * wvs;
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.miner),
        functionName: "attachRewardAsset",
        arguments: [_assetId, maxAmountPerPeriod],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }

  async attachRewards(_amm, _assetId, _rewardRate) {
    let rewardRate = _rewardRate * wvs;
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.miner),
        functionName: "attachRewards",
        arguments: [address(_amm), _assetId, rewardRate],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }

  async claimAllRewards(_assetId, _period) {
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.miner),
        functionName: "claimAllRewards",
        arguments: [_assetId, `${_period}`],
      },
      this.sender
    );

    await waitForTx(tx.id);
    return tx;
  }

  async setFeeDiscountTiers(_discounts) {
    let discountsStr = _discounts.map((x) => x.join(":")).join(",");
    let tx = await invoke(
      {
        dApp: this.address || address(this.e.seeds.miner),
        functionName: "setFeeDiscountTiers",
        arguments: [discountsStr],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }

  async getTraderVolume(_trader) {
    let dApp = address(this.e.seeds.miner);
    let value = await accountDataByKey(
      `k_traderCumulativeVolume_${address(_trader)}`,
      dApp
    ).then((x) => x.value);
    return value;
  }

  async getTraderFeeInPeriod(_amm, _trader, _period) {
    let amm = address(_amm);
    let dApp = address(this.e.seeds.miner);
    let value = await accountDataByKey(
      `k_traderFeesInPeriod_${amm}_${_trader}_${_period}`,
      dApp
    ).then((x) => x.value);
    return value;
  }

  async getAmmFeeInPeriod(_amm, _period) {
    let amm = address(_amm);
    let dApp = address(this.e.seeds.miner);
    let value = await accountDataByKey(
      `k_totalFeesInPeriod_${amm}_${_period}`,
      dApp
    ).then((x) => x.value);
    return value;
  }

  async getAssetFeeInPeriod(_assetId, _period) {
    let dApp = address(this.e.seeds.miner);
    let value = await accountDataByKey(
      `k_totalAssetFeesInPeriod_${_assetId}_${_period}`,
      dApp
    ).then((x) => x.value);
    return value;
  }

  async getTraderNotionalInPeriod(_amm, _trader, _period) {
    let amm = address(_amm);
    let dApp = address(this.e.seeds.miner);
    let value = await accountDataByKey(
      `k_traderAverageNotionalInPeriod_${amm}_${_trader}_${_period}`,
      dApp
    ).then((x) => x.value);
    return value;
  }

  async getTraderScoreInPeriod(_amm, _trader, _period) {
    let amm = address(_amm);
    let dApp = address(this.e.seeds.miner);
    let value = await accountDataByKey(
      `k_traderScoreInPeriod_${amm}_${_trader}_${_period}`,
      dApp
    ).then((x) => x.value);
    return value;
  }

  async getAmmScoreInPeriod(_amm, _period) {
    let amm = address(_amm);
    let dApp = address(this.e.seeds.miner);
    let value = await accountDataByKey(
      `k_totalScoreInPeriod_${amm}_${_period}`,
      dApp
    ).then((x) => x.value);
    return value;
  }

  async getPeriod() {
    const invokeTx = invokeScript(
      {
        dApp: address(this.e.seeds.miner),
        call: {
          function: "view_getPeriod",
          args: [],
        },
      },
      this.e.seeds.admin
    );

    try {
      await broadcast(invokeTx);
    } catch (e) {
      let { message } = JSON.parse(JSON.stringify(e));
      let parts = message
        .replace("Error while executing account-script: ", "")
        .split(",");
      let weekStart = parseInt(parts[0]);
      let weekEnd = parseInt(parts[1]);
      let timestamp = parseInt(parts[2]);

      return {
        weekStart,
        weekEnd,
        timestamp,
      };
    }
  }

  async getTraderRewardInPeriod(_assetId, _trader, _period) {
    const invokeTx = invokeScript(
      {
        dApp: address(this.e.seeds.miner),
        call: {
          function: "view_claimAllRewards",
          args: [
            {
              type: "string",
              value: _trader,
            },
            {
              type: "string",
              value: _assetId,
            },
            {
              type: "string",
              value: `${_period}`,
            },
          ],
        },
      },
      this.e.seeds.admin
    );

    try {
      await broadcast(invokeTx);
    } catch (e) {
      let { message } = JSON.parse(JSON.stringify(e));
      let parts = message
        .replace("Error while executing account-script: ", "")
        .split(",");
      let rewards = parseInt(parts[0]);
      let claimed = parseInt(parts[1]);

      return {
        rewards,
        claimed,
      };
    }
  }

  async getComputeFeeDiscount(_trader) {
    const invokeTx = invokeScript(
      {
        dApp: address(this.e.seeds.miner),
        call: {
          function: "view_computeFeeDiscount",
          args: [
            {
              type: "string",
              value: address(_trader),
            },
          ],
        },
      },
      this.e.seeds.admin
    );

    try {
      await broadcast(invokeTx);
    } catch (e) {
      let { message } = JSON.parse(JSON.stringify(e));
      let parts = message
        .replace("Error while executing account-script: ", "")
        .split(",");
      let discount = parseInt(parts[0]);

      return discount;
    }
  }

  async getMaxAmountOfAssetToDistribute(_amm, _assetId, _period) {
    const invokeTx = invokeScript(
      {
        dApp: address(this.e.seeds.miner),
        call: {
          function: "view_getMaxAmountOfAssetToDistribute",
          args: [
            {
              type: "string",
              value: address(_amm),
            },
            {
              type: "string",
              value: _assetId,
            },
            {
              type: "integer",
              value: _period,
            },
          ],
        },
      },
      this.e.seeds.admin
    );

    try {
      await broadcast(invokeTx);
    } catch (e) {
      let { message } = JSON.parse(JSON.stringify(e));
      let parts = message
        .replace("Error while executing account-script: ", "")
        .split(",");
      let amount = parseInt(parts[0]);

      return amount;
    }
  }
}

class Orders {
  FULL_POSITION = -1;

  constructor(e, sender) {
    this.e = e;
    this.sender = sender;
  }

  as(_sender) {
    return new Orders(this.e, _sender);
  }

  async upgrade() {
    console.log(`Upgrading Orders ${this.address}`);
    return this.e.upgradeContract("orders2.ride", this.address, 3700000);
  }

  async createOrder(
    _amm,
    _type,
    _triggerPrice,
    _limitPrice,
    _amountIn,
    _leverage,
    _side,
    _usdnPayment,
    _refLink = ""
  ) {
    let triggerPrice = Math.round(_triggerPrice * decimals);
    let limitPrice = Math.round(_limitPrice * decimals);
    let amountIn = 0;
    if (_amountIn == this.FULL_POSITION) {
      let size = await accountDataByKey(
        `k_positionSize_${address(this.sender)}`,
        _amm
      ).then((x) => x.value);

      amountIn = Math.abs(size);
    } else {
      amountIn = Math.round(_amountIn * decimals);
    }
    let leverage = Math.round(_leverage * decimals);
    let usdnPayment = Math.round((_usdnPayment || 0) * decimals);

    console.log(
      `createOrder = ${JSON.stringify([
        _amm,
        _type,
        triggerPrice,
        limitPrice,
        amountIn,
        leverage,
        _side,
        _refLink,
      ])}`
    );
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.orders),
        functionName: "createOrder",
        arguments: [
          _amm,
          _type,
          triggerPrice,
          limitPrice,
          amountIn,
          leverage,
          _side,
          _refLink,
        ],
        payment:
          usdnPayment == 0
            ? []
            : [
                {
                  assetId: this.e.assets.neutrino,
                  amount: usdnPayment,
                },
              ],
      },
      this.sender
    );

    let ttx = await waitForTx(tx.id);
    let id = ttx.stateChanges.invokes[0].stateChanges.data
      .filter((x) => x.key === "k_lastOrderId")
      .map((x) => x.value)[0];

    console.log(JSON.stringify(ttx));
    return [id, ttx];
  }

  async executeOrder(_order) {
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.orders),
        functionName: "executeOrder",
        arguments: [_order],
      },
      this.sender
    );

    await waitForTx(tx.id);
    return tx;
  }

  async canExecute(_order) {
    const invokeTx = invokeScript(
      {
        dApp: address(this.e.seeds.orders),
        call: {
          function: "view_canExecuteOrder",
          args: [
            {
              value: _order,
              type: "integer",
            },
          ],
        },
      },
      this.e.seeds.admin
    );

    try {
      await broadcast(invokeTx);
    } catch (e) {
      let { message } = JSON.parse(JSON.stringify(e));
      let msg = message.replace("Error while executing account-script: ", "");

      if (msg === "Success") {
        return [true];
      } else {
        return [false, msg];
      }
    }
  }

  async cancelOrder(_order) {
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.orders),
        functionName: "cancelOrder",
        arguments: [_order],
      },
      this.sender
    );

    await waitForTx(tx.id);
    return tx;
  }
}

class Referral {
  constructor(e, address, sender) {
    this.e = e;
    this.address = address;
    this.sender = sender;
  }

  as(_sender) {
    return new Referral(this.e, this.address, _sender);
  }

  async upgrade() {
    console.log(`Upgrading Referral ${this.address}`);
    return this.e.upgradeContract("referral.ride", this.address, 3700000);
  }

  async createReferralLink() {
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.referral),
        functionName: "createReferralLink",
        arguments: [],
      },
      this.sender
    );

    await waitForTx(tx.id);
    return tx;
  }

  async setSwapAddress(_swapAddress) {
    let tx = await invoke(
      {
        dApp: this.address,
        functionName: "setSwapAddress",
        arguments: [_swapAddress],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }

  async claimRewards() {
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.referral),
        functionName: "claimRewards",
        arguments: [],
      },
      this.sender
    );

    await waitForTx(tx.id);
    return tx;
  }

  async getLinksFor(_referrerAddress) {
    let allKeys = await accountData(address(this.e.seeds.referral));
    allKeys = Object.keys(allKeys).map((k) => allKeys[k]);
    const result = allKeys
      .filter((x) => x.key.startsWith(`k_ref_link_owner`))
      .filter((x) => x.value === _referrerAddress)
      .map((x) => x.key.replace(`k_ref_link_owner_`, ``));
    return result;
  }

  async getReferrer(_referralAddress) {
    return await accountDataByKey(
      `k_referrer_${_referralAddress}`,
      address(this.e.seeds.referral)
    ).then((x) => x && x.value);
  }

  async getEarned(_referrerAddress) {
    return await accountDataByKey(
      `k_referrer_earned_${_referrerAddress}`,
      address(this.e.seeds.referral)
    ).then((x) => x && (x.value || 0) / wvs);
  }

  async getClaimed(_referrerAddress) {
    return await accountDataByKey(
      `k_referrer_claimed_${_referrerAddress}`,
      address(this.e.seeds.referral)
    ).then((x) => x && (x.value || 0) / wvs);
  }
}

class Staking {
  constructor(e, address, sender) {
    this.e = e;
    this.address = address;
    this.sender = sender;
  }

  as(_sender) {
    return new Staking(this.e, this.address, _sender);
  }

  async upgrade() {
    console.log(`Upgrading Rewards ${this.address}`);
    return this.e.upgradeContract("rewards.ride", this.address, 3700000);
  }

  async migrateLiquidity() {
    let tx = await invoke(
      {
        dApp: this.address,
        functionName: "migrateLiquidity",
        arguments: [],
        payment: [],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }

  async stake(_amount) {
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.staking),
        functionName: "stake",
        arguments: [],
        payment: [
          {
            amount: Math.round(_amount * wvs),
            assetId: this.e.assets.tsn,
          },
        ],
      },
      this.sender
    );

    await waitForTx(tx.id);
    return tx;
  }

  async unStake(_amount) {
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.staking),
        functionName: "unStake",
        arguments: [Math.round(_amount * wvs)],
      },
      this.sender
    );

    await waitForTx(tx.id);
    return tx;
  }

  async withdrawRewards() {
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.staking),
        functionName: "withdrawRewards",
        arguments: [],
      },
      this.sender
    );

    await waitForTx(tx.id);
    return tx;
  }

  async addRewards(_amount) {
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.staking),
        functionName: "addRewards",
        arguments: [],
        payment: [
          {
            amount: Math.round(_amount * decimals),
            assetId: this.e.assets.neutrino,
          },
        ],
      },
      this.sender
    );

    await waitForTx(tx.id);
    return tx;
  }
}

class Farming {
  constructor(e, address, sender) {
    this.e = e;
    this.address = address;
    this.sender = sender;
  }

  as(_sender) {
    return new Farming(this.e, address, _sender);
  }

  async upgrade() {
    console.log(`Upgrading Farming ${this.address}`);
    return this.e.upgradeContract("farming.ride", this.address, 3700000);
  }

  async stake(_amount) {
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.farming),
        functionName: "stake",
        arguments: [],
        payment: [
          {
            amount: Math.round(_amount * wvs),
            assetId: this.e.assets.tsn,
          },
        ],
      },
      this.sender
    );

    await waitForTx(tx.id);
    return tx;
  }

  async unStake(_amount) {
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.farming),
        functionName: "unStake",
        arguments: [Math.round(_amount * wvs)],
      },
      this.sender
    );

    await waitForTx(tx.id);
    return tx;
  }

  async withdrawRewards() {
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.farming),
        functionName: "withdrawRewards",
        arguments: [],
      },
      this.sender
    );

    await waitForTx(tx.id);
    return tx;
  }

  async ackRewards(_amount) {
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.farming),
        functionName: "ackRewards",
        arguments: [],
        payment: [],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }
}

class Vault {
  constructor(e, address, sender) {
    this.e = e;
    this.address = address;
    this.sender = sender;
  }

  as(_sender) {
    return new Vault(this.e, address, _sender);
  }

  async upgrade() {
    console.log(`Upgrading Vault ${this.address}`);
    return this.e.upgradeContract("vault.ride", this.address, 3700000);
  }

  async stake(_amount) {
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.vault),
        functionName: "stake",
        arguments: [],
        payment: [
          {
            amount: Math.round(_amount * decimals),
            assetId: this.e.assets.neutrino,
          },
        ],
      },
      this.sender
    );

    await waitForTx(tx.id);
    return tx;
  }

  async unStake(_amount) {
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.vault),
        functionName: "unStake",
        arguments: [Math.round(_amount * decimals)],
      },
      this.sender
    );

    await waitForTx(tx.id);
    return tx;
  }

  async addFree(_amount) {
    await this.e.supplyUsdn(_amount, address(this.e.seeds.admin));

    let tx = await invoke(
      {
        dApp: address(this.e.seeds.vault),
        functionName: "addFree",
        arguments: [],
        payment: [
          {
            amount: Math.round(_amount * decimals),
            assetId: this.e.assets.neutrino,
          },
        ],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }

  async exchangeFreeAndLocked(_amount) {
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.vault),
        functionName: "exchangeFreeAndLocked",
        arguments: [Math.round(_amount * decimals)],
        payment: [],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }

  async balanceOf(_trader) {
    let trader = address(_trader);

    const balanceRaw = await accountDataByKey(
      `k_balance_${trader}`,
      address(this.e.seeds.vault)
    ).then((x) => x.value);

    return Number.parseFloat(Number.parseFloat(balanceRaw / wvs).toFixed(4));
  }

  async rate() {
    const rateRaw = await accountDataByKey(
      `k_rate`,
      address(this.e.seeds.vault)
    ).then((x) => (x ? x.value : 1 * wvs));

    return Number.parseFloat(Number.parseFloat(rateRaw / wvs).toFixed(4));
  }

  async usdnBalanceOf(_trader) {
    let shares = await this.balanceOf(_trader);
    let rate = await this.rate();

    return shares * rate;
  }

  async lockedBalance() {
    const balanceRaw = await accountDataByKey(
      `k_lockedBalance`,
      address(this.e.seeds.vault)
    ).then((x) => (x ? x.value : 0));

    return Number.parseFloat(Number.parseFloat(balanceRaw / wvs).toFixed(4));
  }

  async freeBalance() {
    const balanceRaw = await accountDataByKey(
      `k_freeBalance`,
      address(this.e.seeds.vault)
    ).then((x) => (x ? x.value : 0));

    return Number.parseFloat(Number.parseFloat(balanceRaw / wvs).toFixed(4));
  }

  async getWithdrawLimit(_trader) {
    let trader = address(_trader);
    let dApp = address(this.e.seeds.vault);

    console.log(`getWithdrawLimit trader=${trader}`);

    const invokeTx = invokeScript(
      {
        dApp: dApp,
        call: {
          function: "view_withdrawLimit",
          args: [
            {
              value: trader,
              type: "string",
            },
          ],
        },
      },
      this.e.seeds.admin
    );

    try {
      await broadcast(invokeTx);
    } catch (e) {
      let { message } = JSON.parse(JSON.stringify(e));
      let parts = message
        .replace("Error while executing account-script: ", "")
        .split(",");
      let amount = Number.parseFloat(
        Number.parseFloat(parseInt(parts[0]) / decimals).toFixed(4)
      );

      return {
        amount,
      };
    }
  }
}

class Housekeeper {
  constructor(e, address, sender) {
    this.e = e;
    this.address = address;
    this.sender = sender;
  }

  as(_sender) {
    return new Housekeeper(this.e, address, _sender);
  }

  async upgrade() {
    console.log(`Upgrading Housekeeper ${this.address}`);
    return this.e.upgradeContract("housekeeper.ride", this.address, 3700000);
  }

  async performHousekeeping(amms) {
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.housekeeper),
        functionName: "performHousekeeping",
        arguments: [amms],
        payment: [],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }
}

class Prizes {
  constructor(e, address, sender) {
    this.e = e;
    this.address = address;
    this.sender = sender;
  }

  as(_sender) {
    return new Prizes(this.e, address, _sender);
  }

  async upgrade() {
    console.log(`Upgrading Prizes ${this.address}`);
    return this.e.upgradeContract("prizes.ride", this.address, 3700000);
  }

  async claimPrize(nonce, recipient, assetId, amount, signature) {
    console.log(`${nonce} ${recipient} ${assetId} ${amount} ${signature}`);
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.prizes),
        functionName: "claimPrize",
        arguments: [nonce, recipient, assetId, "" + amount, signature],
        payment: [],
      },
      this.sender
    );

    await waitForTx(tx.id);
    return tx;
  }
}

class NFTManager {
  constructor(e, address, sender) {
    this.e = e;
    this.address = address;
    this.sender = sender;
  }

  as(_sender) {
    return new NFTManager(this.e, address, _sender);
  }

  async upgrade() {
    console.log(`Upgrading NFTManager ${this.address}`);
    return this.e.upgradeContract("nfts.ride", this.address, 3700000);
  }

  async createNftType(
    name,
    description,
    nftImageLink,
    collection,
    type,
    typeValue
  ) {
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.nfts),
        functionName: "createNftType",
        arguments: [
          name,
          description,
          nftImageLink,
          collection,
          type,
          typeValue,
        ],
        payment: [],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }

  async getNftDetails(assetId) {
    const type = await accountDataByKey(
      `k_token_type_${assetId}`,
      address(this.e.seeds.nfts)
    ).then((x) => x.value);
    const value = await accountDataByKey(
      `k_token_param_${assetId}`,
      address(this.e.seeds.nfts)
    ).then((x) => x.value);

    return {
      type,
      value,
    };
  }
}

class Manager {
  constructor(e, address) {
    this.e = e;
    this.address = address;
  }

  async upgrade() {
    console.log(`Upgrading v ${this.address}`);
    return this.e.upgradeContract("manager.ride", this.address, 3700000);
  }
}

module.exports = {
  Environment,
};
