const rpcProxyHandler = {
  get(obj, prop) {
    return async (payload) => {
      let response = await obj(prop, JSON.stringify(payload));
      response = JSON.parse(response);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.result;
    };
  },
};

export function fediInit(eventListener) {
  const worker = new Worker('./fedi_worker.js', { type: "module" });
  const callbacks = new Map();
  worker.onmessage = (e) => {
    if (e.data.error) {
      eventListener.onError(e.data.error);
    }
    if (e.data.event) {
      eventListener.onEvent(e.data.event, e.data.data);
    }
    if (e.data.token) {
      const cb = callbacks.get(e.data.token);
      if (cb === undefined) return;
      cb(e.data.data);
      callbacks.delete(e.data.token);
    }
  };
  let token = 0;
  function fediRpc(method, data) {
    return new Promise(resolve => {
      token++;
      callbacks.set(token, res => resolve(res))
      worker.postMessage({token, method, data})
    })
  }

  return new Proxy(fediRpc, rpcProxyHandler);
}
