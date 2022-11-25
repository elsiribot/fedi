import {
    EmitterSubscription,
    NativeEventEmitter,
    NativeModules,
} from 'react-native'

const { FedimintEventEmitter, FedimintFfi } = NativeModules

export type LogEvent = {
    log: string
}

export type BalanceEvent = {
    federationId: string
    balance: number
}

export type ReceivedLightningEvent = {
    federationId: string
    paymentHash: number
}

export type ReceivedBitcoinEvent = {
    federationId: string
    txid: string
    address: string
}

export class TFedimintEventEmitter {
    private emitter: NativeEventEmitter

    constructor() {
        this.emitter = new NativeEventEmitter(FedimintEventEmitter)
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

    onBalanceUpdate = (
        listener: (event: BalanceEvent) => void,
        context?: Object,
    ): EmitterSubscription => {
        return this.addListener('balance', listener, context)
    }

    onReceivedLightning = (
        listener: (event: ReceivedLightningEvent) => void,
        context?: Object,
    ): EmitterSubscription => {
        return this.addListener('receivedLightning', listener, context)
    }

    onReceivedBitcoin = (
        listener: (event: ReceivedBitcoinEvent) => void,
        context?: Object,
    ): EmitterSubscription => {
        return this.addListener('receivedBitcoin', listener, context)
    }
}

export type Federation = {
    name: string
}

export type Transaction = {
    id: number
    createdAt: number
    outgoing: boolean
    amountMillis: number
    amountSats: number
}

export async function joinFederation(connectString: string) {
    await FedimintFfi.joinFederation(connectString)
}

export async function listFederations(): Promise<Federation[]> {
    return FedimintFfi.listFederations()
}

export async function listTransaction(): Promise<Transaction[]> {
    let json = await FedimintFfi.listTransactions()
    return JSON.parse(json)
}
