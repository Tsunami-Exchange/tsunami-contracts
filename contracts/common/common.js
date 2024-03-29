const { publicKeyByAddress } = require("./dataservice");
let {
  deploy,
  upgrade,
  clearScript,
  shouldUpgrade,
} = require("../common/driver");

const wvs = 10 ** 8;
const decimals = 10 ** 6;

class Environment {
  /** @type {Miner} */
  miner = null;
  /** @type {Orders} */
  orders = null;
  /** @type {Referral} */
  referral = null;
  /** @type {Staking} */
  staking = null;
  /** @type {Farming} */
  farming = null;
  /** @type {Housekeeper} */
  housekeeper = null;
  /** @type {Prizes} */
  prizes = null;
  /** @type {NFTManager} */
  nfts = null;
  /** @type {Vault} */
  vault = null;
  /** @type {Manager} */
  manager = null;
  /** @type {Vires} */
  vires = null;
  /** @type {Oracle} */
  oracle = null;
  /** @type {Spot} */
  spot = null;
  /** @type {Swap} */
  swap = null;
  /** @type {SWavesAssetManager} */
  sWavesAssetManager = null;

  /** @type {boolean} */
  isChild = false;

  constructor(admin) {
    this.seeds = {};
    this.assets = {};
    this.addresses = {};
    this.now = new Date().getTime();

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

  async getKey(key) {
    let x = await accountDataByKey(key, this.addresses.coordinator).then(
      (x) => x && x.value
    );

    if (!x) {
      throw Error(`No value for key ${key} on ${this.addresses.coordinator}`);
    }
    return x;
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
    const ordersAddress = await accountDataByKey(
      `k_orders_address`,
      coordinatorAddress
    ).then((x) => x && x.value);
    const collateralAddress = await accountDataByKey(
      `k_collateral_address`,
      coordinatorAddress
    ).then((x) => x && x.value);
    const housekeeperAddress = await accountDataByKey(
      `k_housekeeper_address`,
      coordinatorAddress
    ).then((x) => x && x.value);
    const spotAddress = await accountDataByKey(
      `k_spot_address`,
      coordinatorAddress
    ).then((x) => x && x.value);
    const swapAddress = await accountDataByKey(
      `k_swap_address`,
      coordinatorAddress
    ).then((x) => x && x.value);
    const oracleAddress = await accountDataByKey(
      `k_oracle`,
      coordinatorAddress
    ).then((x) => x && x.value);
    const prizesAddress = await accountDataByKey(
      `k_prizes_address`,
      coordinatorAddress
    ).then((x) => x && x.value);

    let sWavesAssetManagerAddress = await accountDataByKey(
      `k_asset_manager_address_WAVES`,
      managerAddress
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
    this.orders = new Orders(this, ordersAddress);
    this.collateral = new Collateral(this, collateralAddress);
    this.housekeeper = new Housekeeper(this, housekeeperAddress);
    this.spot = new Spot(this, spotAddress);
    this.swap = new Swap(this, swapAddress);
    this.oracle = new Oracle(this, oracleAddress);
    this.prizes = new Prizes(this, prizesAddress);
    this.sWavesAssetManager = new SWavesAssetManager(
      this,
      sWavesAssetManagerAddress
    );

    console.log(`Loaded environment with ${this.amms.length} AMMs`);
  }

  async getChildren() {
    let allKeys = await accountData(this.addresses.coordinator);
    return Object.keys(allKeys)
      .filter((x) => x.startsWith("k_child_"))
      .map((x) => x.replace("k_child_", ""));
  }

  async deployDefaultChild(assetId) {
    if (!assetId) {
      throw Error("No quote asset for child coordinator");
    }
    let assets = {
      reward: this.assets.neutrino,
      neutrino: assetId,
      tsn: this.assets.tsn,
    };

    await setupAccounts({
      xVault: 1 * wvs,
      xHousekeeper: 1 * wvs,
      xStaking: 1 * wvs,
      xCoordinator: 1 * wvs,
      xOrders: 1 * wvs,
      xManager: 1 * wvs,
      xAssetManager: 1 * wvs,
    });

    let seeds = {
      vault: accounts.xVault,
      housekeeper: accounts.xHousekeeper,
      staking: accounts.xStaking,
      coordinator: accounts.xCoordinator,
      orders: accounts.xOrders,
      manager: accounts.xManager,
      assetManager: accounts.xAssetManager,
    };

    let addresses = {
      quoteGovMarket: address(this.seeds.puzzleSwap),
      quoteRewardMarket: address(this.seeds.puzzleSwap),
    };

    let x = await this.deployChild(seeds, assets, addresses);

    // Add 0.0001 to locked in vault
    {
      const fundVaultTx = await invoke(
        {
          dApp: address(seeds.vault),
          functionName: "addLocked",
          arguments: [],
          payment: [
            {
              assetId: assetId,
              amount: 0.0001 * decimals,
            },
          ],
        },
        this.seeds.admin
      );

      broadcast(fundVaultTx);
      console.log("Child vault funded in " + fundVaultTx.id);
    }

    return x;
  }

  async deployChild(seeds, assets, addresses) {
    console.log(`Begin deploy new child environment...`);

    let p1 = deploy(
      "coordinator.ride",
      3400000,
      seeds.coordinator,
      "Coordinator"
    );

    let p2 = deploy(
      "rewardProxy.ride",
      3400000,
      seeds.staking,
      "Staking proxy"
    );

    let p3 = deploy("vault.ride", 3400000, seeds.vault, "Vault");

    let p4 = deploy("orders2.ride", 3400000, seeds.orders, "Orders");

    let p5 = deploy(
      "housekeeper.ride",
      3400000,
      seeds.housekeeper,
      "Housekeeper"
    );

    let p6 = deploy("manager.ride", 3400000, seeds.manager, "Manager");

    let p7 = deploy(
      "simpleAssetManager.ride",
      3400000,
      seeds.assetManager,
      "Vires Asset Manager"
    );

    await Promise.all([p1, p2, p3, p4, p5, p6, p7]);

    console.log(`Deployed unique contracts for child coordinator`);

    let initTxs = [];

    {
      const addSwapFromNewQuoteToGovTx = await invoke(
        {
          dApp: await this.getKey(`k_swap_address`),
          functionName: "addMarket",
          arguments: [assets.neutrino, assets.tsn, addresses.quoteGovMarket],
        },
        this.seeds.admin
      );

      console.log(`addMarket in ${addSwapFromNewQuoteToGovTx.id}`);
      initTxs.push(waitForTx(addSwapFromNewQuoteToGovTx.id));

      const addSwapFromNewQuoteToRewardTx = await invoke(
        {
          dApp: await this.getKey(`k_swap_address`),
          functionName: "addMarket",
          arguments: [
            assets.neutrino,
            assets.reward,
            addresses.quoteRewardMarket,
          ],
        },
        this.seeds.admin
      );

      console.log(`addMarket in ${addSwapFromNewQuoteToRewardTx.id}`);
      initTxs.push(waitForTx(addSwapFromNewQuoteToRewardTx.id));
    }

    {
      /*
      const addAdminTx = await invoke(
        {
          dApp: address(seeds.coordinator),
          functionName: "setAdmin",
          arguments: [address(this.seeds.admin)],
        },
        seeds.coordinator
      );

      console.log(`setAdmin in ${addAdminTx.id}`);
      */

      const addChildTx = await invoke(
        {
          dApp: this.addresses.coordinator,
          functionName: "addChild",
          arguments: [address(seeds.coordinator)],
        },
        this.seeds.admin
      );

      console.log(`addChild in ${addChildTx.id}`);

      await Promise.all([
        //waitForTx(addAdminTx.id),
        waitForTx(addChildTx.id),
      ]);
    }

    {
      const setMinerTx = await invoke(
        {
          dApp: address(seeds.coordinator),
          functionName: "setLiquidityMiner",
          arguments: [await this.getKey("k_miner_address")],
        },
        this.seeds.admin
      );

      console.log(`setLiquidityMiner in ${setMinerTx.id}`);

      const setOrdersTx = await invoke(
        {
          dApp: address(seeds.coordinator),
          functionName: "setOrders",
          arguments: [address(seeds.orders)],
        },
        this.seeds.admin
      );

      console.log(`setOrders in ${setOrdersTx.id}`);

      const setReferralTx = await invoke(
        {
          dApp: address(seeds.coordinator),
          functionName: "setReferral",
          arguments: [await this.getKey("k_referral_address")],
        },
        this.seeds.admin
      );

      const setFarmingTx = await invoke(
        {
          dApp: address(seeds.coordinator),
          functionName: "setFarming",
          arguments: [await this.getKey("k_farming_address")],
        },
        this.seeds.admin
      );

      console.log(`setFarming in ${setFarmingTx.id}`);

      const setQuoteAssetTx = await invoke(
        {
          dApp: address(seeds.coordinator),
          functionName: "setQuoteAsset",
          arguments: [assets.neutrino],
        },
        this.seeds.admin
      );

      console.log(`setQuoteAsset in ${setQuoteAssetTx.id}`);

      const setRewardAssetTx = await invoke(
        {
          dApp: address(seeds.coordinator),
          functionName: "setRewardAsset",
          arguments: [assets.reward],
        },
        this.seeds.admin
      );

      console.log(`setRewardAsset in ${setRewardAssetTx.id}`);

      const setGovAssetTx = await invoke(
        {
          dApp: address(seeds.coordinator),
          functionName: "setGovernanceAsset",
          arguments: [assets.tsn],
        },
        this.seeds.admin
      );

      console.log(`setGovernanceAsset in ${setGovAssetTx.id}`);

      const setStakingAddressTx = await invoke(
        {
          dApp: address(seeds.coordinator),
          functionName: "setStakingAddress",
          arguments: [address(seeds.staking)],
        },
        this.seeds.admin
      );

      console.log(`setStakingAddress in ${setStakingAddressTx.id}`);

      const setManagerAddressTx = await invoke(
        {
          dApp: address(seeds.coordinator),
          functionName: "setManager",
          arguments: [address(seeds.manager)],
        },
        this.seeds.admin
      );

      console.log(`setStakingAddress in ${setManagerAddressTx.id}`);

      const setHousekeeperAddressTx = await invoke(
        {
          dApp: address(seeds.coordinator),
          functionName: "setHousekeeper",
          arguments: [address(seeds.housekeeper)],
        },
        this.seeds.admin
      );

      console.log(`setHousekeeper in ${setHousekeeperAddressTx.id}`);

      const setPrizesAddressTx = await invoke(
        {
          dApp: address(seeds.coordinator),
          functionName: "setPrizes",
          arguments: [await this.getKey(`k_prizes_address`)],
        },
        this.seeds.admin
      );

      console.log(`setPrizes in ${setPrizesAddressTx.id}`);

      const setNftManagerTx = await invoke(
        {
          dApp: address(seeds.coordinator),
          functionName: "setNftManager",
          arguments: [await this.getKey(`k_nft_manager_address`)],
        },
        this.seeds.admin
      );

      console.log(`setNftManager in ${setNftManagerTx.id}`);

      const setVaultTx = await invoke(
        {
          dApp: address(seeds.coordinator),
          functionName: "setVaultAddress",
          arguments: [address(seeds.vault)],
        },
        this.seeds.admin
      );

      const setSwapTx = await invoke(
        {
          dApp: address(seeds.coordinator),
          functionName: "setSwap",
          arguments: [await this.getKey(`k_swap_address`)],
        },
        this.seeds.admin
      );

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
      initTxs.push(waitForTx(setVaultTx.id));
      initTxs.push(waitForTx(setSwapTx.id));
      initTxs.push(waitForTx(setRewardAssetTx.id));
    }

    // Init manager
    {
      let k_initialized = await accountDataByKey(
        `k_initialized`,
        address(seeds.manager)
      ).then((x) => x && x.value);
      if (!k_initialized) {
        const initManagerTx = await invoke(
          {
            dApp: address(seeds.manager),
            functionName: "initialize",
            arguments: [
              address(seeds.coordinator),
              assets.neutrino,
              address(seeds.assetManager),
            ],
          },
          seeds.manager
        );

        initTxs.push(waitForTx(initManagerTx.id));
        console.log("Manager initialized in " + initManagerTx.id);
      }
    }

    // Init simple asset manager
    {
      let k_initialized = await accountDataByKey(
        `k_initialized`,
        address(seeds.assetManager)
      ).then((x) => x && x.value);
      if (!k_initialized) {
        const initSimpleManagerTx = await invoke(
          {
            dApp: address(seeds.assetManager),
            functionName: "initialize",
            arguments: [address(seeds.coordinator)],
          },
          seeds.assetManager
        );

        initTxs.push(waitForTx(initSimpleManagerTx.id));
        console.log(
          "Simple Asset Manager initialized in " + initSimpleManagerTx.id
        );
      }
    }

    // Init proxy staking
    {
      let k_initialized = await accountDataByKey(
        `k_initialized`,
        address(seeds.staking)
      ).then((x) => x && x.value);
      if (!k_initialized) {
        console.log(`Initializing proxy staking...`);
        const initStakingTx = await invoke(
          {
            dApp: address(seeds.staking),
            functionName: "initialize",
            arguments: [
              address(seeds.coordinator),
              await this.getKey(`k_staking_address`),
            ],
          },
          seeds.staking
        );

        initTxs.push(waitForTx(initStakingTx.id));
      }
    }

    // Init housekeeper
    {
      let k_initialized = await accountDataByKey(
        `k_initialized`,
        address(seeds.housekeeper)
      ).then((x) => x && x.value);
      if (!k_initialized) {
        console.log(`Initializing housekeeper...`);
        const initHousekeeperTx = await invoke(
          {
            dApp: address(seeds.housekeeper),
            functionName: "initialize",
            arguments: [address(seeds.coordinator)],
          },
          seeds.housekeeper
        );

        initTxs.push(waitForTx(initHousekeeperTx.id));
        console.log("Housekeeper initialized in " + initHousekeeperTx.id);
      }
    }

    // Init Vault
    {
      let k_initialized = await accountDataByKey(
        `k_initialized`,
        address(seeds.vault)
      ).then((x) => x && x.value);
      if (!k_initialized) {
        const initVaultTx = await invoke(
          {
            dApp: address(seeds.vault),
            functionName: "initialize",
            arguments: [address(seeds.coordinator)],
          },
          seeds.vault
        );

        initTxs.push(waitForTx(initVaultTx.id));
        console.log("Vault initialized in " + initVaultTx.id);
      }
    }

    // Init orders
    {
      let k_initialized = await accountDataByKey(
        `k_initialized`,
        address(seeds.orders)
      ).then((x) => x && x.value);
      if (!k_initialized) {
        const initOrdersTx = await invoke(
          {
            dApp: address(seeds.orders),
            functionName: "initialize",
            arguments: [address(seeds.coordinator)],
          },
          seeds.orders
        );

        initTxs.push(waitForTx(initOrdersTx.id));
        console.log("Orders initialized in " + initOrdersTx.id);
      }
    }

    await Promise.all(initTxs);

    let child = new Environment(this.seeds.admin);

    child.miner = new Miner(child);
    child.orders = new Orders(child);
    child.referral = new Referral(child);
    child.staking = new Staking(child);
    child.farming = new Farming(child);
    child.housekeeper = new Housekeeper(child);
    child.prizes = new Prizes(child);
    child.nfts = new NFTManager(child);
    child.vault = new Vault(child);
    child.manager = new Manager(child);
    child.vires = new Vires(child);

    child.now = new Date().getTime();

    child.seeds = {
      ...this.seeds,
      ...seeds,
    };

    console.log(JSON.stringify(this.seeds));
    console.log(JSON.stringify(seeds));
    console.log(JSON.stringify(child.seeds));

    console.log(`===== ++++ =====`);

    child.assets = {
      ...this.assets,
      ...assets,
    };

    console.log(
      `Child environment deployed @ ${address(child.seeds.coordinator)}`
    );

    return child;
  }

  async deploy() {
    console.log(`Begin deploy new environment...`);
    await setupAccounts({
      coordinator: 0.05 * wvs,
      staking: 0.05 * wvs,
      oracle: 1 * wvs,
      oracleJit: 0.05 * wvs,
      miner: 0.05 * wvs,
      orders: 0.05 * wvs,
      referral: 0.05 * wvs,
      farming: 0.05 * wvs,
      manager: 0.05 * wvs,
      housekeeper: 0.05 * wvs,
      prizes: 0.05 * wvs,
      nfts: 0.05 * wvs,
      vault: 0.05 * wvs,
      viresAssetManager: 0.05 * wvs,
      swap: 0.05 * wvs,
      spot: 0.05 * wvs,
    });

    this.addresses.coordinator = address(accounts.coordinator);

    this.seeds.coordinator = accounts.coordinator;
    this.seeds.staking = accounts.staking;
    this.seeds.oracle = accounts.oracle;
    this.seeds.oracleJit = accounts.oracleJit;
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
    this.seeds.viresAssetManager = accounts.viresAssetManager;
    this.seeds.swap = accounts.swap;
    this.seeds.spot = accounts.spot;

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
    let p01 = await broadcast(
      transfer(
        {
          assetId: this.assets.neutrino,
          recipient: address(this.seeds.admin),
          amount: 0.0001 * decimals,
        },
        this.seeds.assetHolder
      )
    );

    let p02 = await broadcast(
      transfer(
        {
          assetId: this.assets.usdt,
          recipient: address(this.seeds.admin),
          amount: 0.0001 * decimals,
        },
        this.seeds.assetHolder
      )
    );

    let p03 = await broadcast(
      transfer(
        {
          assetId: this.assets.usdc,
          recipient: address(this.seeds.admin),
          amount: 0.0001 * decimals,
        },
        this.seeds.assetHolder
      )
    );

    console.log(`Fund admin from assetHolder in: ${p01.id}`);
    console.log(`Fund admin from assetHolder in: ${p02.id}`);
    console.log(`Fund admin from assetHolder in: ${p03.id}`);

    let p1 = deploy(
      "coordinator.ride",
      3400000,
      this.seeds.coordinator,
      "Coordinator"
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
    let p14 = deploy(
      "vault.ride",
      3400000,
      this.seeds.vault,
      "Vault",
      this.isLocal,
      address(this.seeds.timer)
    );
    let p15 = deploy(
      "viresAssetManager.ride",
      3400000,
      this.seeds.viresAssetManager,
      "Vires Asset Manager",
      this.isLocal,
      address(this.seeds.timer)
    );
    let p16 = deploy(
      "swap.ride",
      3400000,
      this.seeds.swap,
      "Swap",
      this.isLocal,
      address(this.seeds.timer)
    );
    let p17 = deploy(
      "oracle.ride",
      3400000,
      this.seeds.oracleJit,
      "JIT Oracle",
      this.isLocal,
      address(this.seeds.timer)
    );
    let p18 = deploy(
      "spot.ride",
      3400000,
      this.seeds.spot,
      "Spot Exchange",
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
      p01,
      p02,
      p03,
      p1,
      p4,
      p5,
      p6,
      p7,
      p8,
      p9,
      p10,
      p11,
      p12,
      p14,
      p15,
      p16,
      p17,
      p18,
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
          arguments: [address(accounts.admin)],
        },
        this.seeds.coordinator
      );

      console.log(`setAdmin in ${addAdminTx.id}`);
      await waitForTx(addAdminTx.id);

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
          arguments: [this.assets.neutrino],
        },
        this.seeds.admin
      );

      console.log(`setQuoteAsset in ${setQuoteAssetTx.id}`);

      const setRewardAssetTx = await invoke(
        {
          dApp: address(this.seeds.coordinator),
          functionName: "setRewardAsset",
          arguments: [this.assets.neutrino],
        },
        this.seeds.admin
      );

      console.log(`setRewardAsset in ${setRewardAssetTx.id}`);

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

      const setVaultTx = await invoke(
        {
          dApp: address(this.seeds.coordinator),
          functionName: "setVaultAddress",
          arguments: [address(this.seeds.vault)],
        },
        this.seeds.admin
      );

      const setSwapTx = await invoke(
        {
          dApp: address(this.seeds.coordinator),
          functionName: "setSwap",
          arguments: [address(this.seeds.swap)],
        },
        this.seeds.admin
      );

      const setSpotTx = await invoke(
        {
          dApp: address(this.seeds.coordinator),
          functionName: "setSpotAddress",
          arguments: [address(this.seeds.spot)],
        },
        this.seeds.admin
      );

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
      initTxs.push(waitForTx(setVaultTx.id));
      initTxs.push(waitForTx(setSwapTx.id));
      initTxs.push(waitForTx(setRewardAssetTx.id));
      initTxs.push(waitForTx(setSpotTx.id));
    }

    // Init staking
    {
      const initStakingTx = await invoke(
        {
          dApp: address(this.seeds.staking),
          functionName: "initialize",
          arguments: [address(this.seeds.coordinator)],
        },
        this.seeds.staking
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
        this.seeds.miner
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
          arguments: [
            address(this.seeds.coordinator),
            Math.round(0.01 * decimals),
          ],
        },
        this.seeds.orders
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
            //address(this.seeds.puzzleSwap),
          ],
        },
        this.seeds.referral
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
            //address(this.seeds.puzzleSwap),
          ],
        },
        this.seeds.farming
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
            this.assets.neutrino,
            address(this.seeds.viresAssetManager),
          ],
        },
        this.seeds.manager
      );

      initTxs.push(waitForTx(initManagerTx.id));
      console.log("Manager initialized in " + initManagerTx.id);
    }

    // Init vires asset manager
    {
      const initViresManagerTx = await invoke(
        {
          dApp: address(this.seeds.viresAssetManager),
          functionName: "initialize",
          arguments: [
            address(this.seeds.coordinator),
            address(this.seeds.vires),
            this.assets.neutrino,
            address(this.seeds.vires),
          ],
        },
        this.seeds.viresAssetManager
      );

      initTxs.push(waitForTx(initViresManagerTx.id));
      console.log(
        "Vires Asset Manager initialized in " + initViresManagerTx.id
      );
    }

    // Init swap
    {
      const initSwapTx = await invoke(
        {
          dApp: address(this.seeds.swap),
          functionName: "initialize",
          arguments: [
            address(this.seeds.coordinator),
            `${this.assets.neutrino}`,
            `${this.assets.tsn}`,
            `${address(this.seeds.puzzleSwap)}`,
          ],
        },
        this.seeds.swap
      );

      initTxs.push(waitForTx(initSwapTx.id));
      console.log("Swap initialized in " + initSwapTx.id);
    }

    // Init housekeeper
    {
      const initHousekeeperTx = await invoke(
        {
          dApp: address(this.seeds.housekeeper),
          functionName: "initialize",
          arguments: [address(this.seeds.coordinator)],
        },
        this.seeds.housekeeper
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
        this.seeds.prizes
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
        this.seeds.nfts
      );

      initTxs.push(waitForTx(initNFTManagerTx.id));
      console.log("NFT Manager initialized in " + initNFTManagerTx.id);
    }

    // Init Vault
    {
      const initVaultTx = await invoke(
        {
          dApp: address(this.seeds.vault),
          functionName: "initialize",
          arguments: [
            address(this.seeds.coordinator),
            this.assets.neutrino,
            0 * wvs,
          ],
        },
        this.seeds.vault
      );

      initTxs.push(waitForTx(initVaultTx.id));
      console.log("Vault initialized in " + initVaultTx.id);
    }

    // Init Oracle
    {
      const initOracleTx = await invoke(
        {
          dApp: address(this.seeds.oracleJit),
          functionName: "initialize",
          arguments: [
            address(this.seeds.coordinator),
            publicKey(this.seeds.admin),
          ],
        },
        this.seeds.oracleJit
      );

      initTxs.push(waitForTx(initOracleTx.id));
      console.log("Oracle (JIT) initialized in " + initOracleTx.id);
    }

    // Init Spot
    {
      const initSpotTx = await invoke(
        {
          dApp: address(this.seeds.spot),
          functionName: "initialize",
          arguments: [
            address(this.seeds.coordinator),
            Math.round(0.003 * decimals),
            Math.round(0.1 * decimals),
            Math.round(0.3 * decimals),
          ],
        },
        this.seeds.spot
      );

      initTxs.push(waitForTx(initSpotTx.id));
      console.log("Spot initialized in " + initSpotTx.id);
    }

    await Promise.all(initTxs);

    // Add 0.0001 to locked in vault
    {
      const fundVaultTx = await invoke(
        {
          dApp: address(this.seeds.vault),
          functionName: "addLocked",
          arguments: [],
          payment: [
            {
              assetId: this.assets.neutrino,
              amount: 0.0001 * decimals,
            },
          ],
        },
        this.seeds.admin
      );

      broadcast(fundVaultTx);
      console.log("Vault funded in " + fundVaultTx.id);
    }

    this.miner = new Miner(this);
    this.orders = new Orders(this);
    this.referral = new Referral(this);
    this.staking = new Staking(this);
    this.farming = new Farming(this);
    this.housekeeper = new Housekeeper(this);
    this.prizes = new Prizes(this);
    this.nfts = new NFTManager(this);
    this.vault = new Vault(this);
    this.manager = new Manager(this, address(this.seeds.manager));
    this.vires = new Vires(this);
    this.oracle = new Oracle(this);
    this.spot = new Spot(this);
    this.swap = new Swap(this);

    this.now = new Date().getTime();
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

  async deploySpot(swapFee, swapRebate) {
    if (!this.seeds.spot) {
      throw Error(`No seed for Spot contract`);
    }
    if (!swapFee || !swapRebate) {
      throw Error(`No swapFee or swapRebate for Spot`);
    }
    let coordinatorAddress =
      this.addresses.coordinator || address(this.seeds.coordinator);
    let spotAddress = address(this.seeds.spot);
    let fee = 3400000;

    await this.ensureDeploymentFee(spotAddress, fee);

    await deploy("spot.ride", fee, this.seeds.spot, "Spot");

    let spot = await accountDataByKey(
      `k_spot_address`,
      coordinatorAddress
    ).then((x) => x && x.value);
    if (spot !== spotAddress) {
      const setSpotTx = await invoke(
        {
          dApp: coordinatorAddress,
          functionName: "setSpotAddress",
          arguments: [spotAddress],
        },
        this.seeds.admin
      );

      console.log(`setSpot in ${setSpotTx.id}`);
    }

    let initialized = await accountDataByKey(`k_initialized`, spotAddress).then(
      (x) => x && x.value
    );
    if (!initialized) {
      const initSpotTx = await invoke(
        {
          dApp: spotAddress,
          functionName: "initialize",
          arguments: [
            coordinatorAddress,
            Math.round(swapFee * decimals),
            Math.round(swapRebate * decimals),
            Math.round(0.2 * decimals),
          ],
        },
        this.seeds.spot
      );

      await waitForTx(initSpotTx.id);
      console.log("Spot initialized in " + initSpotTx.id);
    }
  }

  async deploySWavesManager(sWavesAddress) {
    if (!this.seeds.sWavesManager) {
      throw Error(`No seed for sWaves Manager contract`);
    }
    if (!sWavesAddress) {
      throw Error(`No sWavesAddress`);
    }

    let coordinatorAddress =
      this.addresses.coordinator || address(this.seeds.coordinator);

    let sWavesManagerAddress = address(this.seeds.sWavesManager);

    let fee = 3400000;

    await this.ensureDeploymentFee(sWavesManagerAddress, fee);

    await deploy(
      "sWavesAssetManager.ride",
      fee,
      this.seeds.sWavesManager,
      "sWaves Asset Manager"
    );

    let manager = await accountDataByKey(
      `k_manager_address`,
      coordinatorAddress
    ).then((x) => x && x.value);

    let wavesManager = await accountDataByKey(
      `k_asset_manager_address_WAVES`,
      manager
    ).then((x) => x && x.value);

    if (wavesManager !== sWavesManagerAddress) {
      const setWavesManagerTx = await invoke(
        {
          dApp: manager,
          functionName: "addAssetManager",
          arguments: ["WAVES", sWavesManagerAddress],
        },
        this.seeds.admin
      );

      console.log(`addAssetManager in ${setWavesManagerTx.id}`);
    }

    let initialized = await accountDataByKey(
      `k_initialized`,
      sWavesManagerAddress
    ).then((x) => x && x.value);
    if (!initialized) {
      const initSWavesManagerTx = await invoke(
        {
          dApp: sWavesManagerAddress,
          functionName: "initialize",
          arguments: [coordinatorAddress, sWavesAddress],
        },
        this.seeds.sWavesManager
      );

      await waitForTx(initSWavesManagerTx.id);
      console.log(
        "sWaves Asset Manager initialized in " + initSWavesManagerTx.id
      );
    }
  }

  async setSpot(spotAddress) {
    if (!spotAddress) {
      throw Error(`No spotAddress`);
    }
    let coordinatorAddress =
      this.addresses.coordinator || address(this.seeds.coordinator);

    let spot = await accountDataByKey(
      `k_spot_address`,
      coordinatorAddress
    ).then((x) => x && x.value);
    if (spot !== spotAddress) {
      const setSpotTx = await invoke(
        {
          dApp: coordinatorAddress,
          functionName: "setSpotAddress",
          arguments: [spotAddress],
        },
        this.seeds.admin
      );

      console.log(`setSpot in ${setSpotTx.id}`);
    }
  }

  async setOracleAddress(oracleAddress) {
    if (!oracleAddress) {
      throw Error(`No oracleAddress`);
    }
    let coordinatorAddress =
      this.addresses.coordinator || address(this.seeds.coordinator);

    let oracle = await accountDataByKey(`k_oracle`, coordinatorAddress).then(
      (x) => x && x.value
    );
    if (oracle !== oracleAddress) {
      const setOracleTx = await invoke(
        {
          dApp: coordinatorAddress,
          functionName: "setOracleAddress",
          arguments: [oracleAddress],
        },
        this.seeds.admin
      );

      console.log(`setOracleTx in ${setOracleTx.id}`);
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

  async deployJitOracle(oraclePublicKeys) {
    if (!this.seeds.jitOracle) {
      throw Error(`No seed for Oracle contract`);
    }

    if (!oraclePublicKeys || !oraclePublicKeys.length) {
      throw Error(`oraclePublicKeys should be array of keys`);
    }

    let coordinatorAddress =
      this.addresses.coordinator || address(this.seeds.coordinator);
    let oracleAddress = address(this.seeds.jitOracle);
    let fee = 3400000;

    await this.ensureDeploymentFee(oracleAddress, fee);

    await deploy("oracle.ride", fee, this.seeds.jitOracle, "JIT Oracle");

    let oracle = await accountDataByKey(
      `k_orders_address`,
      coordinatorAddress
    ).then((x) => x && x.value);
    if (oracle !== oracleAddress) {
      const setOracleTx = await invoke(
        {
          dApp: coordinatorAddress,
          functionName: "setOracleAddress",
          arguments: [oracleAddress],
        },
        this.seeds.admin
      );

      console.log(`setOracleAddress in ${setOracleTx.id}`);
    }

    let initialized = await accountDataByKey(
      `k_initialized`,
      oracleAddress
    ).then((x) => x && x.value);
    if (!initialized) {
      const initOracleTx = await invoke(
        {
          dApp: oracleAddress,
          functionName: "initialize",
          arguments: [coordinatorAddress, oraclePublicKeys.join(",")],
        },
        this.seeds.jitOracle
      );

      await waitForTx(initOracleTx.id);
      console.log("Oracle initialized in " + initOracleTx.id);
    }
  }

  async deploySwap() {
    if (!this.seeds.swap) {
      throw Error(`No seed for Swap contract`);
    }

    let coordinatorAddress =
      this.addresses.coordinator || address(this.seeds.coordinator);
    let swapAddress = address(this.seeds.swap);
    let fee = 3400000;

    await this.ensureDeploymentFee(swapAddress, fee);

    await deploy("swap.ride", fee, this.seeds.swap, "Swap");

    let swap = await accountDataByKey(
      `k_swap_address`,
      coordinatorAddress
    ).then((x) => x && x.value);

    if (swap !== swapAddress) {
      const setSwapTx = await invoke(
        {
          dApp: coordinatorAddress,
          functionName: "setSwap",
          arguments: [swapAddress],
        },
        this.seeds.admin
      );

      console.log(`setSwapTx in ${setSwapTx.id}`);
    }

    let initialized = await accountDataByKey(`k_initialized`, swapAddress).then(
      (x) => x && x.value
    );

    if (!initialized) {
      let farming = await accountDataByKey(
        `k_farming_address`,
        coordinatorAddress
      ).then((x) => x && x.value);

      let swapPoolAddress = await accountDataByKey(
        `k_swapAddress`,
        farming
      ).then((x) => x && x.value);

      let quoteAsset = await accountDataByKey(
        `k_quote_asset`,
        coordinatorAddress
      ).then((x) => x && x.value);

      let govAsset = await accountDataByKey(
        `k_gov_asset`,
        coordinatorAddress
      ).then((x) => x && x.value);

      const initVaultTx = await invoke(
        {
          dApp: swapAddress,
          functionName: "initialize",
          arguments: [
            coordinatorAddress,
            quoteAsset,
            govAsset,
            swapPoolAddress,
          ],
        },
        this.seeds.swap
      );

      await waitForTx(initVaultTx.id);
      console.log("Vault initialized in " + initVaultTx.id);
    }
  }

  async deployViresAssetManager() {
    let coordinatorAddress =
      this.addresses.coordinator || address(this.seeds.coordinator);

    let managerAddress = await accountDataByKey(
      `k_manager_address`,
      coordinatorAddress
    ).then((x) => x && x.value);

    let quoteAsset = await accountDataByKey(
      `k_quote_asset`,
      coordinatorAddress
    ).then((x) => x && x.value);

    console.log(`managerAddress=${managerAddress}`);

    let viresAddress = await accountDataByKey(
      `k_vires_address`,
      managerAddress
    ).then((x) => x && x.value);

    let viresVault = await accountDataByKey(
      `k_vires_vault_${quoteAsset}`,
      managerAddress
    ).then((x) => x && x.value);

    if (!viresAddress || !viresVault) {
      // Already migrated
    }

    if (!this.seeds.viresAssetManager) {
      throw Error(`No seed for Vires Asset Manager contract`);
    }

    if (!viresAddress) {
      throw Error(`No viresAddress`);
    }

    if (!viresVault) {
      throw Error(`No viresVault`);
    }

    if (!quoteAsset) {
      throw Error(`No quoteAsset`);
    }

    let viresAssetManagerAddress = address(this.seeds.viresAssetManager);
    let fee = 3400000;

    await this.ensureDeploymentFee(viresAssetManagerAddress, fee);

    await deploy(
      "viresAssetManager.ride",
      fee,
      this.seeds.viresAssetManager,
      "Vires Asset Manager"
    );

    let initialized = await accountDataByKey(
      `k_initialized`,
      viresAssetManagerAddress
    ).then((x) => x && x.value);
    if (!initialized) {
      const initViresAssetManagerTx = await invoke(
        {
          dApp: viresAssetManagerAddress,
          functionName: "initialize",
          arguments: [coordinatorAddress, viresAddress, quoteAsset, viresVault],
        },
        this.seeds.viresAssetManager
      );

      await waitForTx(initViresAssetManagerTx.id);
      console.log(
        "Vires Asset Manager initialized in " + initViresAssetManagerTx.id
      );
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
          arguments: [address(seeds.manager)],
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

  async deploySimpleAssetManager() {
    await setupAccounts({
      simpleAssetManager: 0.15 * wvs,
    });

    let managerSeed = accounts.simpleAssetManager;

    await deploy(
      "simpleAssetManager.ride",
      3500000,
      managerSeed,
      "Asset Manager (Spot)",
      this.isLocal,
      address(this.seeds.timer)
    );

    const initAssetManagerTx = await invoke(
      {
        dApp: address(managerSeed),
        functionName: "initialize",
        arguments: [address(this.seeds.coordinator)],
      },
      managerSeed
    );

    await waitForTx(initAssetManagerTx.id);

    return address(managerSeed);
  }

  /**
   *
   * @param {*} _liquidity
   * @param {*} _price
   * @param {{
   *  jitOracleStream: string,
   *  fundingPeriodSeconds: number,
   *  initMarginRatio: number,
   *  maintenanceMarginRatio: number,
   *  liquidationFeeRatio: number,
   *  fee: number,
   *  spreadLimit: number,
   *  maxPriceImpact: number,
   *  partialLiquidationRatio: number,
   *  maxPriceSpread: number,
   *  maxOpenNotional: number,
   *  feeToStakersPercent: number,
   *  maxOracleDelay: number,
   *  rolloverFee: number,
   *  fundingMode: number,
   *  minInitMarginRatio: number,
   *  positionMode: number
   * }} options
   * @returns
   */
  async deployAmm(_liquidity, _price, options = {}) {
    await setupAccounts({
      amm: 0.15 * wvs,
    });

    if (!this.seeds.amms) {
      this.seeds.amms = {};
    }

    const ammSeed = accounts.amm;

    console.log(
      `Deploying AMM ${address(ammSeed)} to ${address(this.seeds.coordinator)}`
    );

    this.seeds.amms[address(accounts.amm)] = ammSeed;

    const waitFor = [];

    if (!options.jitOracleStream) {
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
      waitFor.push(waitForTx(seedOracleTx.id));
    } else {
      console.log(
        `Using JIT oracle: ${address(this.seeds.oracleJit)}, stream ${
          options.jitOracleStream
        }`
      );

      await this.oracle.createStream(
        options.jitOracleStream,
        0.05 * decimals,
        10 * decimals
      );
      this.oracle.setPrice(options.jitOracleStream, _price);
    }

    let p3 = deploy(
      //options.kind === "coin" ? "vAMM3c2.ride" : "vAMM3.ride",
      "vAMM3c2.ride",
      7500000,
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

    await Promise.all([p3, waitForTx(addAmmTx.id), ...waitFor]);

    let baseOracle;

    if (!options.jitOracleStream) {
      baseOracle = `${address(this.seeds.oracle)},price,,`;
    } else {
      baseOracle = `${address(this.seeds.oracleJit)},k_stream_data_price_${
        options.jitOracleStream
      },k_stream_data_block_${options.jitOracleStream},`;
    }

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
                value: Math.round((options.fee || 0.0012) * decimals),
              }, // _fee 0.12%
              {
                type: "string",
                value: baseOracle,
              }, // Base oracle data address
              { type: "string", value: "" }, // Quote oracle data
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
              {
                type: "integer",
                value: Math.round(
                  (options.feeToStakersPercent || 0.5) * decimals
                ),
              }, // _feeToStakersPercent 50%
              {
                type: "integer",
                value:
                  options.maxOracleDelay == undefined
                    ? 1
                    : options.maxOracleDelay,
              }, // _maxOracleDelay 1 block
              {
                type: "integer",
                value: Math.round((options.rolloverFee || 0.000001) * decimals),
              }, // _rolloverFee 30% APR
              {
                type: "integer",
                value: options.fundingMode || 1,
              }, // _fundingMode 1 (asymmetric)
              {
                type: "integer",
                value: options.jitOracleStream ? 2 : 1,
              }, // _Oracle mode default 1 (plain)
              {
                type: "integer",
                value: Math.round((options.minInitMarginRatio || 1) * decimals),
              }, // minInitMarginRatio, default 1
              {
                type: "integer",
                value: options.positionMode || 1,
              }, // position mode, default 1 = direct position opening
            ],
          },
        },
        ammSeed
      );

      await broadcast(initTx);
      await waitForTx(initTx.id);

      if (options.kind === "coin") {
        const initTx2 = invokeScript(
          {
            dApp: address(ammSeed),
            call: {
              function: "setSettlementAsset",
              args: [
                {
                  type: "string",
                  value: baseOracle,
                }, // Base oracle data address
              ],
            },
          },
          this.seeds.admin
        );

        await broadcast(initTx2);
        await waitForTx(initTx2.id);
      }

      console.log("vAMM initialized in " + initTx.id);
    }

    const amm = new AMM(this, address(ammSeed));
    this.now = new Date().getTime();
    return amm;
  }

  spotAmmCount = 0;

  async deploySpotAmm(_liquidity, _price, options = {}) {
    if (!options.asset) {
      throw "Error: options.asset expected. Token ID or WAVES";
    }
    let name = `spotAmm_${++this.spotAmmCount}`;
    let vaultName = `spotAmmVault_${++this.spotAmmCount}`;
    let assetManagerName = `spotAssetManager_${++this.spotAmmCount}`;

    await setupAccounts({
      [name]: 0.15 * wvs,
      [vaultName]: 0.15 * wvs,
      [assetManagerName]: 0.15 * wvs,
    });

    if (!this.seeds.amms) {
      this.seeds.amms = {};
    }

    const ammSeed = accounts[name];
    const vaultSeed = accounts[vaultName];
    const managerSeed = accounts[assetManagerName];

    console.log(
      `Deploying Spot AMM ${address(ammSeed)} to ${address(
        this.seeds.coordinator
      )}`
    );

    this.seeds.amms[address(accounts[name])] = ammSeed;

    const waitFor = [];

    if (!options.jitOracleStream) {
      let seedOracleTx = data(
        {
          data: [
            {
              key: `price_${options.asset}`,
              type: "integer",
              value: Math.round(_price * decimals),
            },
          ],
        },
        this.seeds.oracle
      );

      await broadcast(seedOracleTx);

      console.log(`Seed AMM oracle in ${seedOracleTx.id}`);
      waitFor.push(waitForTx(seedOracleTx.id));
    } else {
      console.log(
        `Using JIT oracle: ${address(this.seeds.oracleJit)}, stream ${
          options.jitOracleStream
        }`
      );

      await this.oracle.createStream(
        options.jitOracleStream,
        0.05 * decimals,
        10 * decimals
      );
      this.oracle.setPrice(options.asset, _price);
    }

    let p3 = deploy(
      "vAMM3s.ride",
      7500000,
      ammSeed,
      "vAMM (Spot)",
      this.isLocal,
      address(this.seeds.timer)
    );

    let p4 = deploy(
      "vault.ride",
      3500000,
      vaultSeed,
      "Vault (Spot)",
      this.isLocal,
      address(this.seeds.timer)
    );

    let k_assetManager = await accountDataByKey(
      `k_asset_manager_address_${options.asset}`,
      address(this.seeds.manager)
    ).then((x) => x && x.value);

    let initAssetManager = false;

    if (!k_assetManager) {
      let p5 = deploy(
        "simpleAssetManager.ride",
        3500000,
        managerSeed,
        "Asset Manager (Spot)",
        this.isLocal,
        address(this.seeds.timer)
      );

      let p6 = this.manager.addAssetManager(
        options.asset,
        address(managerSeed)
      );

      waitFor.push(p5);
      waitFor.push(p6);

      initAssetManager = true;
    }

    const addAmmTx = await invoke(
      {
        dApp: address(this.seeds.spot),
        functionName: "addAmm",
        arguments: [address(ammSeed), address(vaultSeed), options.asset, ""],
      },
      this.seeds.admin
    );

    console.log(`addAmm in ${addAmmTx.id}`);

    await Promise.all([p3, p4, waitForTx(addAmmTx.id), ...waitFor]);

    let baseOracle;

    if (!options.jitOracleStream) {
      baseOracle = `${address(this.seeds.oracle)},price_${options.asset},,`;
    } else {
      baseOracle = `${address(this.seeds.oracleJit)},k_stream_data_price_${
        options.jitOracleStream
      },k_stream_data_block_${options.jitOracleStream},`;
    }

    const initTxs = [];

    // Init Vault
    {
      let k_initialized = await accountDataByKey(
        `k_initialized`,
        address(vaultSeed)
      ).then((x) => x && x.value);

      if (!k_initialized) {
        const initVaultTx = await invoke(
          {
            dApp: address(vaultSeed),
            functionName: "initialize",
            arguments: [
              address(this.seeds.coordinator),
              options.asset,
              Math.round((options.maxUtilizationRate || 0.5) * wvs),
            ],
          },
          vaultSeed
        );

        initTxs.push(waitForTx(initVaultTx.id));
        console.log("Spot Vault initialized in " + initVaultTx.id);
      }
    }

    // Init Asset manager
    if (initAssetManager) {
      const initAssetManagerTx = await invoke(
        {
          dApp: address(managerSeed),
          functionName: "initialize",
          arguments: [address(this.seeds.coordinator)],
        },
        managerSeed
      );

      initTxs.push(waitForTx(initAssetManagerTx.id));
      console.log("Spot Asset Manager initialized in " + initAssetManagerTx.id);
    }

    // Init spot AMM
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
              {
                type: "string",
                value: baseOracle,
              }, // Base oracle data address
              { type: "string", value: address(this.seeds.coordinator) }, // Coordinator address,
              {
                type: "integer",
                value: Math.round((options.maxPriceImpact || 0.08) * decimals),
              }, // _maxPriceImpact 8%
              {
                type: "integer",
                value: Math.round((options.maxPriceSpread || 0.045) * decimals),
              },
              {
                type: "integer",
                value:
                  options.maxOracleDelay == undefined
                    ? 1
                    : options.maxOracleDelay,
              },
            ],
          },
        },
        ammSeed
      );

      await broadcast(initTx);
      initTxs.push(waitForTx(initTx.id));

      console.log("Spot vAMM initialized in " + initTx.id);
    }

    await Promise.all(initTxs);

    const amm = new AMM(this, address(ammSeed));
    const vault = new Vault(this, address(vaultSeed), vaultSeed);
    this.now = new Date().getTime();
    return {
      amm,
      vault,
    };
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

  async advanceTime(_delta) {
    await this.setTime(this.now + _delta);
  }

  async setTime(_timestamp) {
    console.log(`Moving time ${this.now} -> ${_timestamp}`);
    this.now = _timestamp;

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
    fee = fee + 1000000; // Initialize
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

    const preTx = data(
      {
        senderPublicKey: publicKey(this.seeds.admin),
        data: [
          {
            key: `status_${address}_${tx.id}`,
            value: true,
          },
        ],
      },
      this.seeds.admin
    );

    await broadcast(preTx);
    await waitForTx(preTx.id);

    await broadcast(tx);
    await waitForTx(tx.id);

    console.log(`Updated key ${key} to ${value} on ${address} in tx ${tx.id}`);
    return tx;
  }

  async forceSetKeyForSeed(seed, key, value) {
    console.log(`seed=${seed}`);
    let fee = 500000;
    await this.ensureDeploymentFee(address(seed), fee);
    let senderPublicKey = await publicKey(seed);
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

    const preTx = data(
      {
        senderPublicKey: publicKey(this.seeds.admin),
        data: [
          {
            key: `status_${address(seed)}_${tx.id}`,
            value: true,
          },
        ],
      },
      this.seeds.admin
    );

    await broadcast(preTx);
    await waitForTx(preTx.id);

    await broadcast(tx);
    await waitForTx(tx.id);

    console.log(
      `Updated key ${key} to ${value} on ${address(seed)} in tx ${tx.id}`
    );
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
    return this.e.upgradeContract("vAMM3.ride", this.address, 7500000);
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

  async migratePosition(trader) {
    let tx = await invoke(
      {
        dApp: this.address,
        functionName: "migratePosition",
        arguments: [trader],
        payment: [],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }

  async getTraders() {
    console.log(`Getting traders for ${this.address}...`);
    let allKeys = await accountData(this.address);
    console.log(`Got traders for ${this.address}!`);
    return Object.keys(allKeys)
      .filter((x) => x.startsWith("k_positionSize_"))
      .map((x) => x.replace("k_positionSize_", ""));
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

    const changeSettingsTx =
      ({
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
      this.e.seeds.admin);

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
        amount: Math.round(_amount * decimals),
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
            { type: "string", value: this.e.oracle.lastPrice || "" },
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

  async addMargin(_amount) {
    let direction = await this.getPositionDirection(
      address(this.e.seeds.amms[this.address]),
      address(this.sender)
    );
    const addMarginTx = invokeScript(
      {
        dApp: address(this.e.seeds.amms[this.address]),
        call: {
          function: "addMargin",
          args: [
            { type: "integer", value: direction },
            { type: "string", value: this.e.oracle.lastPrice || "" },
          ],
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
    let direction = await this.getPositionDirection(
      address(this.e.seeds.amms[this.address]),
      address(this.sender)
    );
    const removeMarginTx = invokeScript(
      {
        dApp: address(this.e.seeds.amms[this.address]),
        call: {
          function: "removeMargin",
          args: [
            { type: "integer", value: _amount * decimals },
            { type: "integer", value: direction },
            { type: "string", value: this.e.oracle.lastPrice || "" },
          ],
        },
      },
      this.sender
    );

    await broadcast(removeMarginTx);
    await waitForTx(removeMarginTx.id);

    return removeMarginTx;
  }

  async closePosition(
    _amount,
    _minQuoteAssetAmount = 0,
    _addToMargin = false,
    direction = 0
  ) {
    if (!direction) {
      direction = await this.getPositionDirection(
        address(this.e.seeds.amms[this.address]),
        address(this.sender)
      );
    }

    await this.e.advanceTime(1);

    if (!_amount) {
      let trader = address(this.sender);
      let dApp = address(this.e.seeds.amms[this.address]);

      _amount = await accountDataByKey(
        `k_positionSize_${trader}_${direction}`,
        dApp
      ).then((x) => x.value);
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
            { type: "integer", value: direction },
            {
              type: "integer",
              value: Math.round(_minQuoteAssetAmount * decimals),
            },
            {
              type: "boolean",
              value: _addToMargin,
            },
            { type: "string", value: this.e.oracle.lastPrice || "" },
          ],
        },
      },
      this.sender
    );

    await broadcast(closePositionTx);
    let ttx = await waitForTx(closePositionTx.id);

    return ttx;
  }

  async liquidate(_trader) {
    let dApp = address(this.e.seeds.amms[this.address]);
    let direction = await this.getPositionDirection(dApp, address(_trader));

    const liquidatePositionTx = invokeScript(
      {
        dApp: address(this.e.seeds.amms[this.address]),
        call: {
          function: "liquidate",
          args: [
            { type: "string", value: address(_trader) },
            { type: "integer", value: direction },
            { type: "string", value: this.e.oracle.lastPrice || "" },
          ],
        },
      },
      this.sender
    );

    console.log("Position liquidated by " + liquidatePositionTx.id);

    await broadcast(liquidatePositionTx);
    await waitForTx(liquidatePositionTx.id);

    return liquidatePositionTx;
  }

  async getOpenNotional() {
    let longNotional = await accountDataByKey(
      "k_openInterestLong",
      this.address
    );

    let shortNotional = await accountDataByKey(
      "k_openInterestShort",
      this.address
    );

    return {
      longNotional: longNotional.value / decimals,
      shortNotional: shortNotional.value / decimals,
    };
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
    await this.e.setTime(nextFundingBlockTs + 1);
    //await waitNBlocks(1);
  }

  async payFunding() {
    const payFundingTx = invokeScript(
      {
        dApp: address(this.e.seeds.amms[this.address]),
        call: {
          function: "payFunding",
          args: [{ type: "string", value: this.e.oracle.lastPrice || "" }],
        },
      },
      this.e.seeds.admin
    );

    console.log("Paid funding tx: " + payFundingTx.id);

    await broadcast(payFundingTx);
    await waitForTx(payFundingTx.id);

    return payFundingTx;
  }

  async changeLiquidity(_amount) {
    const payFundingTx = invokeScript(
      {
        dApp: address(this.e.seeds.amms[this.address]),
        call: {
          function: "changeLiquidity",
          args: [{ type: "integer", value: Math.round(_amount * decimals) }],
        },
      },
      this.e.seeds.admin
    );

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

  async getPositionDirection(dApp, trader) {
    let long = await accountDataByKey(`k_positionSize_${trader}_1`, dApp).then(
      (x) => x && x.value
    );
    let short = await accountDataByKey(`k_positionSize_${trader}_2`, dApp).then(
      (x) => x && x.value
    );

    if (long && short) {
      throw Error(`Both positions are open for ${trader}, specify direction`);
    }

    if (!long && !short) {
      throw Error(`No position open for ${trader}`);
    }

    if (long) {
      return 1;
    }
    if (short) {
      return 2;
    }
  }

  async getPositionInfo(_trader) {
    let trader = address(_trader);
    let dApp = address(this.e.seeds.amms[this.address]);
    let direction = await this.getPositionDirection(dApp, trader);

    let size = await accountDataByKey(
      `k_positionSize_${trader}_${direction}`,
      dApp
    ).then((x) => x.value);
    let positionFraction = await accountDataByKey(
      `k_positionFraction_${trader}_${direction}`,
      dApp
    ).then((x) => x.value);
    let margin = await accountDataByKey(
      `k_positionMargin_${trader}_${direction}`,
      dApp
    ).then((x) => x.value);
    let openNotional = await accountDataByKey(
      `k_positionOpenNotional_${trader}_${direction}`,
      dApp
    ).then((x) => x.value);

    return {
      size,
      margin,
      openNotional,
      positionFraction,
    };
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

  async getAmmData() {
    let dApp = address(this.e.seeds.amms[this.address]);
    let quote = await accountDataByKey(`k_qtAstR`, dApp).then((x) => x.value);
    let quoteW = await accountDataByKey(`k_qtAstW`, dApp).then((x) =>
      x ? x.value : decimals
    );
    let base = await accountDataByKey(`k_bsAstR`, dApp).then((x) => x.value);
    let size = await accountDataByKey(`k_totalPositionSize`, dApp).then((x) =>
      x ? x.value : 0
    );

    let rawQ = quote / decimals;
    let rawB = base / decimals;
    let rawq = quoteW / decimals;
    let rawsize = size / decimals;

    return {
      quoteAssetReserve: Number.parseFloat(rawQ.toFixed(4)),
      baseAssetReserve: Number.parseFloat(rawB.toFixed(4)),
      quoteAssetWeight: Number.parseFloat(rawq.toFixed(4)),
      totalPositionSize: Number.parseFloat(rawsize.toFixed(4)),
    };
    //let rawB = (base * baseW) / decimals;
    //return Number.parseFloat((rawQ / rawB).toFixed(4));
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

    let direction = await this.getPositionDirection(
      address(this.e.seeds.amms[this.address]),
      trader
    );

    const invokeTx = invokeScript(
      {
        dApp: address(this.e.seeds.amms[this.address]),
        call: {
          function: "view_calcRemainMarginWithFundingPayment",
          args: [
            { type: "string", value: trader },
            { type: "integer", value: direction },
            { type: "string", value: this.e.oracle.lastPrice || "" },
          ],
        },
      },
      this.e.seeds.admin
    );

    try {
      await broadcast(invokeTx);
    } catch (e) {
      let { message } = JSON.parse(JSON.stringify(e));
      if (message.includes("xxx")) {
        throw Error(message);
      }
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
      let rolloverFee = Number.parseFloat(
        (parseInt(parts[6]) / 10 ** 6).toFixed(4)
      );
      let info = await this.getPositionInfo(_trader);

      return {
        margin,
        fundingPayment,
        marginRatio,
        unrealizedPnl,
        badDebt,
        positionalNotional,
        rolloverFee,
        size: info.size / decimals,
        openNotional: info.openNotional / decimals,
        leverage: info.openNotional / decimals / (info.margin / decimals),
      };
    }
  }

  async getFunding() {
    const invokeTx = invokeScript(
      {
        dApp: address(this.e.seeds.amms[this.address]),
        call: {
          function: "view_getFunding",
          args: [{ type: "string", value: this.e.oracle.lastPrice || "" }],
        },
      },
      this.e.seeds.admin
    );

    try {
      await broadcast(invokeTx);
    } catch (e) {
      let { message } = JSON.parse(JSON.stringify(e));
      if (message.includes("xxx")) {
        throw Error(message);
      }
      let parts = message
        .replace("Error while executing account-script: ", "")
        .split(",");

      // s(longFunding) + s(shortFunding) + s(getTwapSpotPrice()) + s(getOraclePrice()) + s(premiumToVault)
      let longFunding = Number.parseFloat(
        (parseInt(parts[0]) / 10 ** 6).toFixed(6)
      );
      let shortFunding = Number.parseFloat(
        (parseInt(parts[1]) / 10 ** 6).toFixed(6)
      );
      let twapMarketPrice = Number.parseFloat(
        (parseInt(parts[2]) / 10 ** 6).toFixed(6)
      );
      let indexPrice = Number.parseFloat(
        (parseInt(parts[3]) / 10 ** 6).toFixed(6)
      );
      let premiumToVault = Number.parseFloat(
        (parseInt(parts[4]) / 10 ** 6).toFixed(6)
      );

      return {
        longFunding,
        shortFunding,
        twapMarketPrice,
        indexPrice,
        premiumToVault,
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
      console.log(message);
      if (message.includes("xxx")) {
        throw Error(message);
      }
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

  constructor(e, address, sender) {
    this.e = e;
    this.sender = sender;
    this.address = address;
  }

  as(_sender) {
    return new Orders(this.e, this.address, _sender);
  }

  async upgrade() {
    console.log(`Upgrading Orders ${this.address}`);
    return this.e.upgradeContract("orders2.ride", this.address, 3700000);
  }

  async changeSettings(_spreadLimit = 1, _isWhitelist = false) {
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.orders),
        functionName: "changeSettings",
        arguments: [Math.round(_spreadLimit * decimals), _isWhitelist],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }

  async addWhitelist(_addresses) {
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.orders),
        functionName: "addWhitelist",
        arguments: [_addresses.join(",")],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }

  async removeWhitelist(_addresses) {
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.orders),
        functionName: "removeWhitelist",
        arguments: [_addresses.join(",")],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
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
    _refLink = "",
    _stopTriggerPrice = 0,
    _stopLimitPrice = 0,
    _takeTriggerPrice = 0,
    _takeLimitPrice = 0,
    _expiration = this.e.now + 1000 * 60 * 24
  ) {
    let positionDirection = 0;
    if (_type == 1 || _type == 2) {
      if (_side == 1) {
        positionDirection = 2;
      } else {
        positionDirection = 1;
      }
    } else {
      positionDirection = _side;
    }
    let triggerPrice = Math.round(_triggerPrice * decimals);
    let limitPrice = Math.round(_limitPrice * decimals);
    let amountIn = 0;
    if (_amountIn == this.FULL_POSITION) {
      let size = await accountDataByKey(
        `k_positionSize_${address(this.sender)}_${positionDirection}`,
        _amm
      ).then((x) => x.value);

      amountIn = Math.abs(size);
    } else {
      amountIn = Math.round(_amountIn * decimals);
    }
    let leverage = Math.round(_leverage * decimals);
    let usdnPayment = Math.round((_usdnPayment || 0) * decimals);

    /*
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
        _stopTriggerPrice,
        _stopLimitPrice,
        _takeTriggerPrice,
        _takeLimitPrice,
      ])}`
    );
    */
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
          _stopTriggerPrice,
          _stopLimitPrice,
          _takeTriggerPrice,
          _takeLimitPrice,
          _expiration,
          this.e.oracle.lastPrice || "",
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
    let datas = ttx.stateChanges.invokes.flatMap((i) => i.stateChanges.data);

    //console.log(JSON.stringify(datas, null, 2));

    let id = datas
      .filter((x) => x.key === "k_lastOrderId")
      .map((x) => x.value)[0];

    //console.log(`id=${id}`);

    //console.log(JSON.stringify(ttx));
    return [id, ttx];
  }

  async executeOrder(_order) {
    await this.e.setTime(new Date().getTime() + 1);
    //
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.orders),
        functionName: "executeOrder",
        arguments: [_order, ""],
      },
      this.sender
    );

    await waitForTx(tx.id);
    return tx;
  }

  async getOrderCount(_trader, _amm) {
    return await accountDataByKey(
      `k_traderOrderCnt_${_amm}_${_trader}`,
      address(this.e.seeds.orders)
    ).then((x) => (x ? x.value : 0));
  }

  async canExecute(_order) {
    if (!_order) {
      throw Error(`canExecute called with no order`);
    }
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
            {
              value: "",
              type: "string",
            },
          ],
        },
      },
      this.sender || this.e.seeds.admin
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

    let txx = await waitForTx(tx.id);
    return txx;
  }

  async cleanUpStaleOrders(_amm, _trader) {
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.orders),
        functionName: "cleanUpStaleOrders",
        arguments: [_amm, address(_trader)],
      },
      this.e.seeds.admin
    );

    let txx = await waitForTx(tx.id);
    return txx;
  }

  async increasePositionWithStopLoss(
    _amm,
    _amount,
    _direction,
    _leverage,
    _minBaseAssetAmount = 0,
    _link = "",
    _stopTriggerPrice,
    _stopLimitPrice,
    _takeTriggerPrice,
    _takeLimitPrice
  ) {
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.orders),
        functionName: "increasePositionWithStopLoss",
        arguments: [
          _amm,
          _direction,
          Math.round(_leverage * decimals),
          Math.round(_minBaseAssetAmount * decimals),
          _link || "",
          Math.round(_stopTriggerPrice * decimals),
          Math.round(_stopLimitPrice * decimals),
          Math.round(_takeTriggerPrice * decimals),
          Math.round(_takeLimitPrice * decimals),
          this.e.oracle.lastPrice || "",
        ],
        payment: [
          {
            assetId: this.e.assets.neutrino,
            amount: Math.round(_amount * decimals),
          },
        ],
      },
      this.sender
    );

    let ttx = await waitForTx(tx.id);
    return ttx;
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

  async ackRewards() {
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.staking),
        functionName: "ackRewards",
        arguments: [],
        payment: [],
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
  constructor(e, address, seed, sender) {
    this.e = e;
    this.address = address;
    this.sender = sender;
    this.seed = seed || e.seeds.vault;
  }

  as(_sender) {
    return new Vault(this.e, this.address, this.seed, _sender);
  }

  async upgrade() {
    console.log(`Upgrading Vault ${this.address}`);
    return this.e.upgradeContract("vault.ride", this.address, 3700000);
  }

  async addRewards(_amount) {
    let tx = await invoke(
      {
        dApp: address(this.seed),
        functionName: "addRewards",
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

  async changeBufferSettings(_bufferRate, _bufferUnderRate, _bufferOverRate) {
    let tx = await invoke(
      {
        dApp: address(this.seed),
        functionName: "changeBufferSettings",
        arguments: [
          Math.round(_bufferRate * wvs),
          Math.round(_bufferUnderRate * wvs),
          Math.round(_bufferOverRate * wvs),
        ],
        payment: [],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }

  async ackRewards() {
    let tx = await invoke(
      {
        dApp: address(this.seed),
        functionName: "ackRewards",
        arguments: [],
        payment: [],
      },
      this.sender
    );

    await waitForTx(tx.id);
    return tx;
  }

  async withdrawRewards() {
    let tx = await invoke(
      {
        dApp: address(this.seed),
        functionName: "withdrawRewards",
        arguments: [],
      },
      this.sender
    );

    await waitForTx(tx.id);
    return tx;
  }

  async stake(_amount) {
    const assetDecimals = await accountDataByKey(
      `k_vaultAssetDecimals`,
      address(this.seed)
    ).then((x) => x.value);

    const asset = await accountDataByKey(
      `k_vaultAsset`,
      address(this.seed)
    ).then((x) => x.value);

    console.log(`stake: vault asset=${asset}`);

    let tx = await invoke(
      {
        dApp: address(this.seed),
        functionName: "stake",
        arguments: [],
        payment: [
          {
            amount: Math.round(_amount * 10 ** assetDecimals),
            assetId: asset === "WAVES" ? null : asset,
          },
        ],
      },
      this.sender
    );

    await waitForTx(tx.id);
    return tx;
  }

  async unStake(_amount) {
    const assetDecimals = await accountDataByKey(
      `k_vaultAssetDecimals`,
      address(this.seed)
    ).then((x) => x.value);

    let tx = await invoke(
      {
        dApp: address(this.seed),
        functionName: "unStake",
        arguments: [Math.round(_amount * 10 ** assetDecimals)],
      },
      this.sender
    );

    await waitForTx(tx.id);
    return tx;
  }

  async addFree(_amount) {
    const assetDecimals = await accountDataByKey(
      `k_vaultAssetDecimals`,
      address(this.seed)
    ).then((x) => x.value);

    const asset = await accountDataByKey(
      `k_vaultAsset`,
      address(this.seed)
    ).then((x) => x.value);

    await this.e.supplyUsdn(_amount, address(this.e.seeds.admin));

    let tx = await invoke(
      {
        dApp: address(this.seed),
        functionName: "addFree",
        arguments: [],
        payment: [
          {
            amount: Math.round(_amount * 10 ** assetDecimals),
            assetId: asset == "WAVES" ? null : asset,
          },
        ],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }

  async addBuffer(_amount) {
    const assetDecimals = await accountDataByKey(
      `k_vaultAssetDecimals`,
      address(this.seed)
    ).then((x) => x.value);

    const asset = await accountDataByKey(
      `k_vaultAsset`,
      address(this.seed)
    ).then((x) => x.value);

    await this.e.supplyUsdn(_amount, address(this.e.seeds.admin));

    let tx = await invoke(
      {
        dApp: address(this.seed),
        functionName: "addBuffer",
        arguments: [],
        payment: [
          {
            amount: Math.round(_amount * 10 ** assetDecimals),
            assetId: asset == "WAVES" ? null : asset,
          },
        ],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }

  async withdrawBuffer(_amount) {
    const assetDecimals = await accountDataByKey(
      `k_vaultAssetDecimals`,
      address(this.seed)
    ).then((x) => x.value);

    await this.e.supplyUsdn(_amount, address(this.e.seeds.admin));

    let tx = await invoke(
      {
        dApp: address(this.seed),
        functionName: "withdrawBuffer",
        arguments: [Math.round(_amount * 10 ** assetDecimals)],
        payment: [],
      },
      this.sender || this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }

  async addLocked(_amount) {
    const assetDecimals = await accountDataByKey(
      `k_vaultAssetDecimals`,
      address(this.seed)
    ).then((x) => x.value);

    const asset = await accountDataByKey(
      `k_vaultAsset`,
      address(this.seed)
    ).then((x) => x.value);

    await this.e.supplyUsdn(_amount, address(this.e.seeds.admin));

    let tx = await invoke(
      {
        dApp: address(this.seed),
        functionName: "addLocked",
        arguments: [],
        payment: [
          {
            amount: Math.round(_amount * 10 ** assetDecimals),
            assetId: asset == "WAVES" ? null : asset,
          },
        ],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }

  async exchangeFreeAndLocked(_amount) {
    const assetDecimals = await accountDataByKey(
      `k_vaultAssetDecimals`,
      address(this.seed)
    ).then((x) => x.value);

    let tx = await invoke(
      {
        dApp: address(this.seed),
        functionName: "exchangeFreeAndLocked",
        arguments: [Math.round(_amount * 10 ** assetDecimals)],
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
      address(this.seed)
    ).then((x) => x.value);

    return Number.parseFloat(Number.parseFloat(balanceRaw / wvs).toFixed(4));
  }

  async rate() {
    const rateRaw = await accountDataByKey(`k_rate`, address(this.seed)).then(
      (x) => (x ? x.value : 1 * wvs)
    );

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
      address(this.seed)
    ).then((x) => (x ? x.value : 0));

    return Number.parseFloat(Number.parseFloat(balanceRaw / wvs).toFixed(4));
  }

  async freeBalance() {
    const balanceRaw = await accountDataByKey(
      `k_freeBalance`,
      address(this.seed)
    ).then((x) => (x ? x.value : 0));

    return Number.parseFloat(Number.parseFloat(balanceRaw / wvs).toFixed(4));
  }

  async excessBalance() {
    const balanceRaw = await accountDataByKey(
      `k_excessBalance`,
      address(this.seed)
    ).then((x) => (x ? x.value : 0));

    return Number.parseFloat(Number.parseFloat(balanceRaw / wvs).toFixed(4));
  }

  async bufferBalance() {
    const balanceRaw = await accountDataByKey(
      `k_bufferBalance`,
      address(this.seed)
    ).then((x) => (x ? x.value : 0));

    return Number.parseFloat(Number.parseFloat(balanceRaw / wvs).toFixed(4));
  }

  async freeBorrowedBalance() {
    const balanceRaw = await accountDataByKey(
      `k_freeBalanceBorrowed`,
      address(this.seed)
    ).then((x) => (x ? x.value : 0));

    return Number.parseFloat(Number.parseFloat(balanceRaw / wvs).toFixed(4));
  }

  async getWithdrawLimit(_trader) {
    const assetDecimals = await accountDataByKey(
      `k_vaultAssetDecimals`,
      address(this.seed)
    ).then((x) => x.value);

    let trader = address(_trader);
    let dApp = address(this.seed);

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
        Number.parseFloat(parseInt(parts[0]) / 10 ** assetDecimals).toFixed(4)
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
        arguments: [true, true, true, amms],
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

  async pause() {
    let tx = await invoke(
      {
        dApp: this.address,
        functionName: "pause",
        arguments: [],
        payment: [],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }

  async unpause() {
    let tx = await invoke(
      {
        dApp: this.address,
        functionName: "unpause",
        arguments: [],
        payment: [],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }

  async migrate(_assetId) {
    let tx = await invoke(
      {
        dApp: this.address,
        functionName: "migrate",
        arguments: [_assetId],
        payment: [],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }

  async migrate(_assetId) {
    let tx = await invoke(
      {
        dApp: this.address,
        functionName: "migrate",
        arguments: [_assetId],
        payment: [],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }

  async addAssetManager(_quoteAssetId, _assetManager) {
    let tx = await invoke(
      {
        dApp: this.address,
        functionName: "addAssetManager",
        arguments: [_quoteAssetId, _assetManager],
        payment: [],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }

  async changeAssetManager(_quoteAssetId, _assetManager) {
    let tx = await invoke(
      {
        dApp: this.address,
        functionName: "changeAssetManager",
        arguments: [_quoteAssetId, _assetManager],
        payment: [],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }

  async usdnBalance() {
    let key = `k_funds_${this.e.assets.neutrino}`;
    let data = await accountDataByKey(key, address(this.e.seeds.manager)).then(
      (e) => e.value
    );
    return Number.parseFloat((data / decimals).toFixed(4));
  }
}

class Collateral {
  constructor(e, address) {
    this.e = e;
    this.address = address;
  }

  async upgrade() {
    console.log(`Upgrading Collateral ${this.address}`);
    return this.e.upgradeContract("collateral.ride", this.address, 3700000);
  }
}

class Vires {
  constructor(e, address, sender) {
    this.e = e;
    this.address = address;
    this.sender = sender;
  }

  as(_sender) {
    return new Vires(this.e, address, _sender);
  }

  async addProfit(_amount) {
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.vires),
        functionName: "addProfit",
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

class Oracle {
  constructor(e, address, sender) {
    this.e = e;
    this.address = address;
    this.sender = sender;
  }

  as(_sender) {
    return new Oracle(this.e, address, _sender);
  }

  async upgrade() {
    console.log(`Upgrading Oracle ${this.address}`);
    return this.e.upgradeContract("oracle.ride", this.address, 3700000);
  }

  async createStream(_name, _maxDeviation, _ttl) {
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.oracleJit),
        functionName: "createStream",
        arguments: [_name, _maxDeviation, _ttl],
        payment: [],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }

  async setOraclePublicKeys(_keys) {
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.oracleJit),
        functionName: "setOraclePublicKeys",
        arguments: [_keys.join(",")],
        payment: [],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }

  async updateData(_data) {
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.oracleJit),
        functionName: "updateData",
        arguments: [_data],
        payment: [],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }

  async pause(_id) {
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.oracleJit),
        functionName: "pause",
        arguments: [_id],
        payment: [],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }

  async unPause(_id) {
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.oracleJit),
        functionName: "unPause",
        arguments: [_id],
        payment: [],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }

  async getStreamData(_id) {
    const price = await accountDataByKey(
      `k_stream_data_price_${_id}`,
      address(this.e.seeds.oracleJit)
    ).then((x) => x.value);

    const timestamp = await accountDataByKey(
      `k_stream_data_timestamp_${_id}`,
      address(this.e.seeds.oracleJit)
    ).then((x) => x.value);

    return {
      price,
      timestamp,
    };
  }

  setPrice(_stream, _price, _seeds = [this.e.seeds.admin]) {
    let sec = 1000;
    const signData = (_signers, _data) => {
      let data = _data.join(",");
      let signatures = _signers.map((s) => {
        let sig = signBytes(s, new TextEncoder().encode(data));
        return `${publicKey(s)}=${sig}`;
      });

      return signatures.join(":");
    };

    let data = [
      _stream,
      this.e.now + 1 * sec,
      Math.round(_price * decimals),
      Math.round(_price * decimals * 0.005),
    ];
    let signature = signData(_seeds, data);

    let update = [...data, signature].join("__");
    this.lastPrice = update;

    return this.lastPrice;
  }
}

class Spot {
  constructor(e, address, sender) {
    this.e = e;
    this.address = address;
    this.sender = sender;
  }

  as(_sender) {
    return new Spot(this.e, address, _sender);
  }

  async upgrade() {
    console.log(`Upgrading Spot ${this.address}`);
    return this.e.upgradeContract("spot.ride", this.address, 3700000);
  }

  /**
   *
   * @returns {[Vault]}
   */
  async getVaults() {
    let allKeys = await accountData(this.address);
    allKeys = Object.keys(allKeys).map((k) => allKeys[k]);
    const vaultAddress = allKeys
      .filter((x) => x.key.startsWith(`k_vault_`))
      .map((x) => x.key.replace(`k_vault_`, ``));

    return vaultAddress.map((v) => new Vault(this.e, v));
  }

  /**
   *
   * @returns {[SpotAMM]}
   */
  async getMarkets() {
    let allKeys = await accountData(this.address);
    allKeys = Object.keys(allKeys).map((k) => allKeys[k]);
    const ammAddress = allKeys
      .filter((x) => x.key.startsWith(`k_amm_3`))
      .map((x) => x.key.replace(`k_amm_`, ``));

    return ammAddress.map((v) => new SpotAMM(this.e, v));
  }

  async swap(
    _sourceToken,
    _sourceAmount,
    _targetToken,
    _minExpectedTargetAmount
  ) {
    let sd = _sourceToken == "WAVES" ? 8 : 6;
    let td = _targetToken == "WAVES" ? 8 : 6;

    let tx = await invoke(
      {
        dApp: address(this.e.seeds.spot),
        functionName: "swap",
        arguments: [
          _targetToken,
          Math.round(_minExpectedTargetAmount * 10 ** td),
        ],
        payment: [
          {
            amount: Math.round(_sourceAmount * 10 ** sd),
            assetId: _sourceToken == "WAVES" ? null : _sourceToken,
          },
        ],
      },
      this.sender
    );

    await waitForTx(tx.id);
    return tx;
  }

  async estimateSwap(_sourceAmount, _sourceToken, _targetToken) {
    let sd = _sourceToken == "WAVES" ? 8 : 6;
    let td = _targetToken == "WAVES" ? 8 : 6;

    const invokeTx = invokeScript(
      {
        dApp: address(this.e.seeds.spot),
        call: {
          function: "view_estimateSwap",
          args: [
            { type: "integer", value: Math.round(_sourceAmount * 10 ** sd) },
            { type: "string", value: _sourceToken },
            { type: "string", value: _targetToken },
          ],
        },
      },
      this.e.seeds.admin
    );

    try {
      await broadcast(invokeTx);
    } catch (e) {
      let { message } = JSON.parse(JSON.stringify(e));
      console.log(message);
      if (message.includes("xxx")) {
        throw Error(message);
      }
      let parts = message
        .replace("Error while executing account-script: ", "")
        .split(",");

      let targetAmount = Number.parseFloat(
        (parseInt(parts[0]) / 10 ** td).toFixed(4)
      );
      let feeInTargetToken = Number.parseFloat(
        (parseInt(parts[1]) / 10 ** td).toFixed(4)
      );
      let resultTargetAssetAmount = Number.parseFloat(
        (parseInt(parts[2]) / 10 ** td).toFixed(4)
      );

      let baseFee = Number.parseFloat(
        (parseInt(parts[3]) / 10 ** 6).toFixed(4)
      );
      let actualFee = Number.parseFloat(
        (parseInt(parts[4]) / 10 ** 6).toFixed(4)
      );
      let rebate = Number.parseFloat((parseInt(parts[5]) / 10 ** 6).toFixed(4));
      let tax = Number.parseFloat((parseInt(parts[6]) / 10 ** 6).toFixed(4));

      let addImbalanceUSD = Number.parseFloat(
        (parseInt(parts[7]) / 10 ** 6).toFixed(4)
      );
      let addVaultBalanceUSD = Number.parseFloat(
        (parseInt(parts[8]) / 10 ** 6).toFixed(4)
      );
      let removeImbalanceUSD = Number.parseFloat(
        (parseInt(parts[9]) / 10 ** 6).toFixed(4)
      );
      let removeVaultBalanceUSD = Number.parseFloat(
        (parseInt(parts[10]) / 10 ** 6).toFixed(4)
      );

      return {
        targetAmount,
        feeInTargetToken,
        resultTargetAssetAmount,
        baseFee,
        actualFee,
        rebate,
        tax,
        addImbalanceUSD,
        addVaultBalanceUSD,
        removeImbalanceUSD,
        removeVaultBalanceUSD,
      };
    }
  }

  async estimateProjectedLiquidity(_sourceToken, _tokenDelta = 0) {
    const invokeTx = invokeScript(
      {
        dApp: address(this.e.seeds.spot),
        call: {
          function: "view_estimateProjectedLiquidity",
          args: [
            { type: "string", value: _sourceToken },
            { type: "integer", value: Math.round(_tokenDelta * 10 ** 8) },
          ],
        },
      },
      this.e.seeds.admin
    );

    try {
      await broadcast(invokeTx);
    } catch (e) {
      let { message } = JSON.parse(JSON.stringify(e));
      console.log(JSON.stringify(e));
      if (message.includes("xxx")) {
        throw Error(message);
      }
      let parts = message
        .replace("Error while executing account-script: ", "")
        .split(",");

      let baseChangeAmount = Number.parseFloat(
        (parseInt(parts[0]) / 10 ** 8).toFixed(4)
      );
      let quoteChangeAmount = Number.parseFloat(
        (parseInt(parts[1]) / 10 ** 8).toFixed(4)
      );

      return {
        baseChangeAmount,
        quoteChangeAmount,
      };
    }
  }
}

class Swap {
  constructor(e, address, sender) {
    this.e = e;
    this.address = address;
    this.sender = sender;
  }

  as(_sender) {
    return new Swap(this.e, address, _sender);
  }

  async upgrade() {
    console.log(`Upgrading Swap ${this.address}`);
    return this.e.upgradeContract("swap.ride", this.address, 3700000);
  }

  async addMarket(_sourceToken, _targetToken, _market) {
    let tx = await invoke(
      {
        dApp: address(this.e.seeds.swap),
        functionName: "addMarket",
        arguments: [_sourceToken, _targetToken, _market],
        payment: [],
      },
      this.e.seeds.admin
    );

    await waitForTx(tx.id);
    return tx;
  }
}

class SWavesAssetManager {
  constructor(e, address, sender) {
    this.e = e;
    this.address = address;
    this.sender = sender;
  }

  as(_sender) {
    return new Swap(this.e, address, _sender);
  }

  async upgrade() {
    console.log(`Upgrading SWavesAssetManager ${this.address}`);
    return this.e.upgradeContract(
      "sWavesAssetManager.ride",
      this.address,
      3700000
    );
  }
}

class SpotAMM {
  constructor(e, address, sender) {
    this.e = e;
    this.sender = sender;
    this.address = address;
  }

  as(_sender) {
    return new AMM(this.e, this.address, _sender);
  }

  async upgrade() {
    console.log(`Upgrading Spot AMM ${this.address}`);
    return this.e.upgradeContract("vAMM3s.ride", this.address, 4500000);
  }
}

module.exports = {
  Environment,
  AMM,
  Vault,
  Spot,
};
