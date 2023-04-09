import {
    Federation,
    Transaction,
    SocialRecoveryEvent,
} from '@fedi/common/types'
import { FedimintRpc } from '@fedi/common/utils/fedimint'
import {
    EmitterSubscription,
    NativeEventEmitter,
    NativeModules,
} from 'react-native'

const { BridgeNativeEventEmitter, FedimintFfi } = NativeModules

export type LogEvent = {
    log: string
}

export type FederationEvent = Federation

export type TransactionEvent = {
    federationId: string
    transaction: Transaction
}

export type RecoveryFileCreationEvent =
    | { type: 'progress'; percentComplete: number }
    | { type: 'failed'; errorCode: string }
    | { type: 'complete' }

export class BridgeEventEmitter {
    private emitter: NativeEventEmitter

    constructor() {
        this.emitter = new NativeEventEmitter(BridgeNativeEventEmitter)
    }

    removeAllListeners = (eventType: string): void => {
        this.emitter.removeAllListeners(eventType)
    }
    // json-deserializes events
    addListener = (
        eventType: string,
        // TODO: maybe we should say this is one of the event types ?
        listener: (event: any) => void,
        context?: Object,
    ): EmitterSubscription => {
        return this.emitter.addListener(
            eventType,
            (serializedEvent: string) => listener(JSON.parse(serializedEvent)),
            context,
        )
    }

    onLog = (
        listener: (event: LogEvent) => void,
        context?: Object,
    ): EmitterSubscription => {
        return this.addListener('log', listener, context)
    }

    onFederationUpdate = (
        listener: (event: FederationEvent) => void,
        context?: Object,
    ): EmitterSubscription => {
        return this.addListener('federation', listener, context)
    }

    onTransaction = (
        listener: (event: TransactionEvent) => void,
        context?: Object,
    ): EmitterSubscription => {
        // Instantiate `Transaction` instance so helper methods exist
        const typedListener = (event: TransactionEvent) => {
            return listener({ ...event })
        }
        return this.addListener('transaction', typedListener, context)
    }

    onSocialRecovery = (
        listener: (event: SocialRecoveryEvent) => void,
        context?: Object,
    ): EmitterSubscription => {
        return this.addListener('socialRecovery', listener, context)
    }

    onRecoveryFileCreation = (
        listener: (event: RecoveryFileCreationEvent) => void,
        context?: Object,
    ): EmitterSubscription => {
        return this.addListener('recoveryFileCreation', listener, context)
    }
}

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

export const fedimint = new FedimintRpc(fedimintRpc)

export async function initializeBridge(dataDir: string) {
    const logLevel = 'info'
    return FedimintFfi.initialize(dataDir, logLevel)
}
