// worker to run bridge in a different thread
// request: {token: int, method: string, data: string}
// response: {event: string, data: string} | {token: int, result: string} | {error: string}

import init, {
  fedimint_initialize,
  fedimint_rpc,
  get_logs,
} from "./wasm/fedi_wasm.js";

const globalInit = (async () => {
  await init("/fedi.wasm");
  await fedimint_initialize({
    event(event_name: string, data: string) {
      postMessage({ event: event_name, data });
    },
  });
})()
  // if initialization fails
  .catch((error) => postMessage({ error: String(error) }));

async function rpcRequest(method: string, data: string): Promise<string> {
  await globalInit;
  return await fedimint_rpc(method, data);
}

// handle the request
onmessage = function (e) {
  const { token, method, data } = e.data;
  if (method == "getLogs") {
    (async () => {
      const file = await get_logs();
      postMessage({
        token,
        // TODO: release data??
        result: JSON.stringify({ result: URL.createObjectURL(file) }),
      });
    })();
    return;
  }
  rpcRequest(method, data)
    .then((result) => postMessage({ token, result }))
    .catch((error) => postMessage({ error: String(error) }));
};
