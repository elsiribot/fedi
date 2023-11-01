// worker to run bridge in a different thread
// request: {token: int, method: string, data: string}
// response: {event: string, data: string} | {token: int, result: string} | {error: string}
import { makeLog } from '@fedi/common/utils/log'
import init, {
    fedimint_initialize,
    fedimint_rpc,
    get_logs,
} from '@fedi/common/wasm/'

const log = makeLog('web/lib/bridge/wasm.worker')

async function workerInit() {
    await init(new URL('@fedi/common/wasm/fedi_wasm_bg.wasm', import.meta.url))
    const result = await fedimint_initialize({
        event(event_name: string, data: string) {
            postMessage({ event: event_name, data })
        },
    })

    try {
        const parsedJson = JSON.parse(result)
        if (parsedJson.error !== undefined) {
            log.error('fedimint_initialize ', parsedJson)
            throw new Error('Failed to initialize bridge')
        }
    } catch (err) {
        log.error('Invalid json from fedimint initialize', err)
    }

    postMessage({ event: 'initialized' })
}

const initPromise = workerInit().catch(error =>
    postMessage({ error: String(error) }),
)

async function rpcRequest(method: string, data: string): Promise<string> {
    await initPromise
    return await fedimint_rpc(method, data)
}

// Handles worker.postMessage calls
addEventListener('message', e => {
    const { token, method, data } = e.data
    if (method == 'getLogs') {
        ;(async () => {
            const file = await get_logs()
            postMessage({
                token,
                // TODO: release data??
                result: JSON.stringify({ result: URL.createObjectURL(file) }),
            })
        })()
        return
    }
    rpcRequest(method, data)
        .then(result => postMessage({ token, result }))
        .catch(error => postMessage({ error: String(error) }))
})
