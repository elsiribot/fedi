import {
    EmitterSubscription,
    NativeEventEmitter,
    NativeModules,
} from 'react-native'
import { TEST_FEDERATION_ID } from './constants'

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

export type Invoice = {
    paymentHash: string
    amount: number
    description: string
    invoice: string
    fee: null | number
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

function handleRpcResponse<Type>(json: string): Type {
    const parsed = JSON.parse(json)
    if (parsed.error) {
        throw Error(parsed.error)
    } else {
        return parsed.result
    }
}

export async function listTransactions(): Promise<Transaction[]> {
    let payload = JSON.stringify({
        federationId: TEST_FEDERATION_ID,
    })
    let response = await FedimintFfi.rpc('listTransactions', payload)
    return handleRpcResponse<Transaction[]>(response)
}

export async function joinFederation(connectString: string) {
    let payload = JSON.stringify({ connectString })
    let response = await FedimintFfi.rpc('joinFederation', payload)
    return handleRpcResponse<null>(response)
}

export async function listFederations(): Promise<Federation[]> {
    let payload = JSON.stringify({}) // FIXME
    let response = await FedimintFfi.rpc('listFederations', payload)
    return handleRpcResponse<Federation[]>(response)
}

export async function generateInvoice(
    amount: string,
    description: string,
): Promise<string> {
    let payload = JSON.stringify({
        amount,
        description,
        federationId: TEST_FEDERATION_ID,
    })
    let response = await FedimintFfi.rpc('generateInvoice', payload)
    return handleRpcResponse<string>(response)
}

export async function decodeInvoice(invoice: string): Promise<Invoice> {
    let payload = JSON.stringify({ invoice })
    let response = await FedimintFfi.rpc('decodeInvoice', payload)
    return handleRpcResponse<Invoice>(response)
}

export async function payInvoice(invoice: string) {
    let payload = JSON.stringify({ invoice, federationId: TEST_FEDERATION_ID })
    let response = await FedimintFfi.rpc('payInvoice', payload)
    return handleRpcResponse<null>(response)
}

export async function generateAddress(): Promise<string> {
    let payload = JSON.stringify({ federationId: TEST_FEDERATION_ID })
    let response = await FedimintFfi.rpc('generateAddress', payload)
    return handleRpcResponse<string>(response)
}

export async function payAddress(
    address: string,
    amount: string,
): Promise<string> {
    let payload = JSON.stringify({
        address,
        amount,
        federationId: TEST_FEDERATION_ID,
    })
    let response = await FedimintFfi.rpc('payAddress', payload)
    return handleRpcResponse<string>(response)
}

export async function init(dataDir: string) {
    return FedimintFfi.init(dataDir)
}
