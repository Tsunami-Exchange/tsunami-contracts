const wvs = 10 ** 8;
const decimals = 10 ** 6;

const neutrino = "HezsdQuRDtzksAYUy97gfhKy7Z1NW2uXYSHA3bgqenNZ";

describe("Insurance fund should", async function () {
  this.timeout(1000000);

  before(async function () {
    await setupAccounts({
      admin: 0.05 * wvs,
      user: 0.05 * wvs,
      dApp: 0.05 * wvs,
      whitelisted: 0.05 * wvs,
    });

    const code = file("insurance.ride")
      .replace("3MseEJNEHkYhvcHre6Mann1F8e27S1qptdg", address(accounts.admin))
      .replace(
        "A6ZtwikNTr19YpC1t6HnNGCBJF6GTx62DhEkJpgpzpmL",
        publicKey(accounts.admin)
      );

    const script = compile(code);
    const ssTx = setScript({ script }, accounts.dApp);
    await broadcast(ssTx);
    await waitForTx(ssTx.id);
    console.log("Insurance Fund Deployed to " + ssTx.id);
  });

  it("Can add to whitelist", async function () {
    const addWhitelistTx = invokeScript(
      {
        dApp: address(accounts.dApp),
        call: {
          function: "addWhitelist",
          args: [{ type: "string", value: address(accounts.whitelisted) }],
        },
      },
      accounts.admin
    );

    await broadcast(addWhitelistTx);
    await waitForTx(addWhitelistTx.id);
    console.log("Added to whitetlist " + addWhitelistTx.id);
  });

  it("Can NOT add to whitelist as NON ADMIN", async function () {
    try {
      const addWhitelistTx = invokeScript(
        {
          dApp: address(accounts.dApp),
          call: {
            function: "addWhitelist",
            args: [{ type: "string", value: address(accounts.user) }],
          },
        },
        accounts.user
      );

      await broadcast(addWhitelistTx);
    } catch (e) {
      return;
    }
    throw Error("Should be error");
  });

  it("Can add insurance funds (as whietlisted)", async function () {
    const fundWlTx = transfer({
      assetId: neutrino,
      amount: 1 * decimals,
      recipient: address(accounts.whitelisted),
    });

    await broadcast(fundWlTx);
    await waitForTx(fundWlTx.id);

    const addInsuranceFundsTx = invokeScript(
      {
        dApp: address(accounts.dApp),
        call: {
          function: "deposit",
        },
        payment: [
          {
            amount: 1 * decimals,
            assetId: neutrino,
          },
        ],
      },
      accounts.whitelisted
    );

    await broadcast(addInsuranceFundsTx);
    await waitForTx(addInsuranceFundsTx.id);

    console.log("Added insurance funds by " + addInsuranceFundsTx.id);
  });

  it("Can withdraw insurance funds (as whietlisted)", async function () {
    const removeInsuranceFundsTx = invokeScript(
      {
        dApp: address(accounts.dApp),
        call: {
          function: "withdraw",
          args: [{ type: "integer", value: 1 * decimals }],
        },
      },
      accounts.whitelisted
    );

    await broadcast(removeInsuranceFundsTx);
    await waitForTx(removeInsuranceFundsTx.id);

    console.log("Removed insurance funds by " + removeInsuranceFundsTx.id);
  });

  it("Can remove from whitelist", async function () {
    const removeWhitelistTx = invokeScript(
      {
        dApp: address(accounts.dApp),
        call: {
          function: "removeWhitelist",
          args: [{ type: "string", value: address(accounts.whitelisted) }],
        },
      },
      accounts.admin
    );

    await broadcast(removeWhitelistTx);
    await waitForTx(removeWhitelistTx.id);
    console.log("Removed to whitetlist " + removeWhitelistTx.id);
  });

  it("Can NOT add insurance funds as NOT whietlisted", async function () {
    try {
      const addInsuranceFundsTx = invokeScript(
        {
          dApp: address(accounts.dApp),
          call: {
            function: "deposit",
          },
          payment: [
            {
              amount: 1 * decimals,
              assetId: neutrino,
            },
          ],
        },
        accounts.whitelisted
      );

      await broadcast(addInsuranceFundsTx);
    } catch (e) {
      return;
    }
    throw Error("Should be error");
  });

  it("Can NOT withdraw insurance funds as NOT whietlisted", async function () {
    try {
      const removeInsuranceFundsTx = invokeScript(
        {
          dApp: address(accounts.dApp),
          call: {
            function: "withdraw",
            args: [{ type: "integer", value: 1 * decimals }],
          },
        },
        accounts.whitelisted
      );

      await broadcast(removeInsuranceFundsTx);
    } catch (e) {
      return;
    }
    throw Error("Should be error");
  });
});
