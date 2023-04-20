<script lang="ts">
  import {fediInit} from "./fedi.ts";

  const FEDERATION_CONNECT_STRING = "%FEDERATION_CONNECT_STRING%";

  let hasError = false;
  let isWorking = false;

  $: status = hasError ? "Error" : isWorking ? "Working" : "Idle";

  let fedName = "";
  let joined = null;
  let balance = 0;
  let mnemonic = "";

  const rpc = fediInit({
    onEvent(event, data) {
      if (event == "federation") {
        balance = data.balance;
      }
      console.log("EVENT", event, data);
    },
    onError(error) {
      console.error(error);
      hasError = true;
    }
  });

  // for testing in browser console
  globalThis.rpc = rpc;

  let connectString = "";

  async function main() {
    isWorking = true;
    try {
      const feds = await rpc.listFederations({});
      if (feds.length != 0) {
        fedName = feds[0].id;
        balance = feds[0].balance;
        joined = true;
        mnemonic = (await rpc.getMnemonic({federationId: fedName})).join(" ");
      } else {
        console.log(FEDERATION_CONNECT_STRING);
        const fed = await rpc.joinFederation({connectString: FEDERATION_CONNECT_STRING});
        fedName = fed.id;
        joined = true;
      }
      mnemonic = (await rpc.getMnemonic({federationId: fedName})).join(" ");
    } catch (error) {
      console.error(error);
      hasError = true;
    } finally {
      isWorking = false;
    }
  }

  main();
  async function joinFederation() {
    isWorking = true;
    try {
      const fed = await rpc.joinFederation({connectString});
      fedName = fed.name;
      joined = true;
      mnemonic = (await rpc.getMnemonic({federationId: fedName})).join(" ");
    } catch (error) {
      console.error(error);
      hasError = true;
    } finally {
      isWorking = false;
    }
  }

  let recvAmt = 0;
  let recvInvoice = "";
  async function receive() {
    try {
      isWorking = true;
      const invoice = await rpc.generateInvoice({federationId: fedName, amount: recvAmt, description: "wasm"});
      recvInvoice = invoice;
    } catch (error) {
      console.error(error);
      hasError = true;
    } finally {
      isWorking = false;
    }
  }

  let sendInvoice = "";
  async function send() {
    try {
      isWorking = true;
      await rpc.payInvoice({federationId: fedName, invoice: sendInvoice});
    } catch (error) {
      console.error(error);
      hasError = true;
    } finally {
      isWorking = false;
    }
  }

  async function backup() {
    try {
      isWorking = true;
      await rpc.backupXmppUsername({federationId: fedName, username: "username"});
    } catch (error) {
      console.error(error);
      hasError = true;
    } finally {
      isWorking = false;
    }
  }
  async function recovery() {
    try {
      isWorking = true;
      await rpc.recoverFromMnemonic({federationId: fedName, mnemonic: mnemonic.split(" ")});
    } catch (error) {
      console.error(error);
      hasError = true;
    } finally {
      isWorking = false;
    }
  }

  async function downloadLogs() {
    try {
      isWorking = true;
      const url = await rpc.getLogs({federationId: fedName, mnemonic: mnemonic.split(" ")});
      window.location.assign(url);
    } catch (error) {
      console.error(error);
      hasError = true;
    } finally {
      isWorking = false;
    }
  }
</script>

<main>
  <section>
    Status: <span data-status={status}>{status}</span>
    <button on:click={downloadLogs}>Download logs</button>
  </section>
  {#if joined === false}
    <section>
      <input bind:value={connectString} placeholder="Connect string" />
      <button on:click={joinFederation}>Join Federation</button>
    </section>
  {/if}
  {#if joined === true}
    <section>
      Federation: {fedName}
    </section>
    <section>
      Balance: {balance}
    </section>
    <section>
      <strong>Mnemonic: </strong><input bind:value={mnemonic} />
      <button on:click={backup}>Backup Ecash</button>
      <button on:click={recovery}>Recover Ecash</button>
    </section>
    <section>
      <input bind:value={sendInvoice} placeholder="Invoice" />
      <button on:click={send}>Send</button>
    </section>
    <section>
      <input type=number bind:value={recvAmt} />
      <button on:click={receive}>Receive</button>
    </section>
    {#if recvInvoice != ""}
    <section>
      Invoice: <code>{recvInvoice}</code>
    </section>
    {/if}
  {/if}
</main>

<style>
  section {
    margin-bottom: 10px;
  }
  [data-status="Idle"] {
    color: green;
  }
  [data-status="Working"] {
    color: yellow;
  }
  [data-status="Error"] {
    color: red;
  }
</style>
