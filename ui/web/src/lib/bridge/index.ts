import { FedimintBridge } from '@fedi/common/utils/fedimint'
import { makeLog } from '@fedi/common/utils/log'

const log = makeLog('web/lib/bridge')

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
        callbacks.set(callbackId, (res: unknown) => resolve(res as string))
        worker.postMessage({ token: callbackId, method, data: jsonPayload })
    })

    const parsed = JSON.parse(json)
    if (parsed.error) {
        throw Error(parsed.error)
    } else {
        return parsed.result
    }
}

export const fedimint = new FedimintBridge(fedimintRpc)

let initializePromise: Promise<void> | undefined
export async function initializeBridge() {
    // Only initialize once at a time.
    if (initializePromise) {
        await initializePromise
        return
    }

    initializePromise = new Promise<void>((resolve, reject) => {
        worker = new Worker(new URL('./wasm.worker.ts', import.meta.url))
        worker.onmessage = e => {
            if (e.data.error) {
                log.error('bridge error', e.data)
                return reject(new Error(e.data.error))
            }
            if (e.data.event) {
                // Initialized event is just for us, not emitted.
                if (e.data.event === 'initialized') {
                    return resolve()
                }
                fedimint.emit(e.data.event, JSON.parse(e.data.data))
            }
            if (e.data.token) {
                const cb = callbacks.get(e.data.token)
                if (cb === undefined) {
                    log.warn(
                        `Received token ${e.data.token} with no associated callback, ignoring`,
                    )
                    return
                }
                callbacks.delete(e.data.token)
                cb(e.data.result)
            }
        }
    })

    // After initiailizing, clear promise so subsequent calls re-initialize.
    return initializePromise.finally(() => {
        initializePromise = undefined
    })
}

// Expose bridge API to window for testing in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).fedimint = fedimint
}
