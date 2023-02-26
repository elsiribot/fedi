// worker to run bridge in a different thread
// request: {token: int, method: string, data: string}
// response: {event: string, data: string} | {token: int, result: string} | {error: string}

import init, { fedimint_init, fedimint_rpc } from "./fedi_wasm.js";

const globalInit = (async () => {
  await init();
  await fedimint_init({
    event(event_name, data) {
      postMessage({ event: event_name, data });
    },
  });
})()
  // if initialization fails
  .catch((error) => postMessage({ error: String(error) }));

async function rpcRequest(method, data) {
  await globalInit;
  return await fedimint_rpc(method, data);
}

// handle the request
onmessage = function (e) {
  const { token, method, data } = e.data;
  rpcRequest(method, data)
    .then((result) => postMessage({ token, result }))
    .catch((error) => postMessage({ error: String(error) }));
};
