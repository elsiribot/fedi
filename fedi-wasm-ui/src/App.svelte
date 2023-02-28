<script lang="ts">
  import {fediInit} from "./fedi.ts";
  let hasError = false;
  let isWorking = false;

  let fedName = "";
  let joined = false;
  let balance = 0;

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

  let connectString = "";
  async function joinFederation() {
    isWorking = true;
    try {
      const fed = await rpc.joinFederation({connectString});
      fedName = fed.name;
      joined = true;
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
</script>

<main>
  <section>
    Status: {#if hasError} Error {:else} {#if isWorking} Working {:else} Idle {/if} {/if}
  </section>
  {#if !joined}
    <section>
      <input bind:value={connectString} placeholder="Connect string" />
      <button on:click={joinFederation}>Join Federation</button>
    </section>
  {:else}
    <section>
      Federation: {fedName}
    </section>
    <section>
      Balance: {balance}
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
</style>
