import { FedimintRpc } from '@fedi/common/utils/fedimint'

let worker: Worker
let callbackId = 0
const callbacks = new Map()

async function fedimintRpc<Type = void>(
    method: string,
    payload: object,
): Promise<Type> {
    // Instant throw if bridge is not initialized
    // TODO: Just await promise until it is?
    if (!worker) {
        throw new Error('Fedimint bridge is not ready!')
    }

    // Post a message to the worker
    const jsonPayload = JSON.stringify(payload)
    const json: string = await new Promise(resolve => {
        callbackId++
        callbacks.set(callbackId, (res: any) => resolve(res))
        worker.postMessage({ token: callbackId, method, data: jsonPayload })
    })

    const parsed = JSON.parse(json)
    if (parsed.error) {
        throw Error(parsed.error)
    } else {
        return parsed.result
    }
}

export const fedimint = new FedimintRpc(fedimintRpc)

export function initializeBridge() {
    return new Promise<void>((resolve, reject) => {
        worker = new Worker(new URL('./wasm.worker.ts', import.meta.url))
        worker.onmessage = e => {
            if (e.data.error) {
                console.error('bridge error', e.data.error)
                return reject(new Error(e.data.error))
            }
            if (e.data.event) {
                if (e.data.event === 'initialized') {
                    return resolve()
                }
                // TODO: Other event handling?
                console.log('bridge event', e.data.event)
            }
            if (e.data.token) {
                const cb = callbacks.get(e.data.token)
                if (cb === undefined) {
                    console.warn(
                        `Received token ${e.data.token} with no associated callback, ignoring`,
                    )
                    return
                }
                callbacks.delete(e.data.token)
                cb(e.data.result)
            }
        }
    })
}
