import { NativeEventEmitter, NativeModules } from 'react-native'

import { FedimintBridgeEventMap } from '@fedi/common/types'
import { FedimintBridge } from '@fedi/common/utils/fedimint'

const { BridgeNativeEventEmitter, FedimintFfi } = NativeModules

async function fedimintRpc<Type = void>(
    method: string,
    payload: object,
): Promise<Type> {
    const jsonPayload = JSON.stringify(payload)
    const json: string = await new Promise(resolve => {
        setTimeout(() => resolve(FedimintFfi.rpc(method, jsonPayload)))
    })
    const parsed = JSON.parse(json)
    if (parsed.error) {
        throw Error(parsed.error)
    } else {
        return parsed.result
    }
}

export const fedimint = new FedimintBridge(fedimintRpc)

export async function initializeBridge(dataDir: string) {
    // Pass through all native bridge events to the FedimintBridge class instance
    const emitter = new NativeEventEmitter(BridgeNativeEventEmitter)
    const eventTypes: (keyof FedimintBridgeEventMap)[] = [
        'log',
        'federation',
        'transaction',
        'socialRecovery',
        'recoveryFileCreation',
    ]
    eventTypes.forEach(eventType =>
        emitter.addListener(eventType, data => fedimint.emit(eventType, data)),
    )

    const logLevel = 'info'
    return FedimintFfi.initialize(dataDir, logLevel)
}
