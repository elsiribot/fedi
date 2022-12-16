import {
    EmitterSubscription,
    NativeEventEmitter,
    NativeModules,
} from 'react-native'

const { FedimintEventEmitter, FedimintFfi } = NativeModules

export default class Base {
    constructor(data?: any) {
        Object.keys(data).forEach((field: any) => {
            // @ts-ignore
            this[field] = data[field]
        })
    }
}

export type LogEvent = {
    log: string
}

export type BalanceEvent = {
    federationId: string
    balance: number
}

export type ReceivedLightningEvent = {
    federationId: string
    paymentHash: string
}

export type ReceivedBitcoinEvent = {
    federationId: string
    txid: string
    address: string
}

export type ValidateEcashResponse = {
    amount: number
    valid: boolean
}

export type ReceiveEcashResponse = {
    amount: number
}

export type Invoice = {
    paymentHash: string
    amount: number
    description: string
    invoice: string
    fee: null | number
}

// Temporary until transactions history bridge code gets merged
export type TemporaryTransaction =
    | { type: 'bitcoin'; amount: number }
    | { type: 'lightning'; amount: number }
    | { type: 'ecash'; amount: number }

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

    removeListener = (eventType: string): void => {
        this.emitter.removeAllListeners(eventType)
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

    onSocialRecovery = (
        listener: (event: SocialRecoveryEvent) => void,
        context?: Object,
    ): EmitterSubscription => {
        return this.addListener('socialRecovery', listener, context)
    }
}

export type Node = {
    name: string
    url: string
}

export class Federation extends Base {
    name: string
    connectInfo: {
        members: [number, string][]
    }
    nodes: Node[]

    get approvalsRequired(): number {
        const numNodes = this.nodes.length
        return numNodes - Math.floor((numNodes - 1) / 3)
    }
    get denialThreshold(): number {
        const numNodes = this.nodes.length
        return Math.floor((numNodes - 1) / 3)
    }
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

export async function listTransactions(
    federationId: string,
): Promise<Transaction[]> {
    let payload = JSON.stringify({
        federationId,
    })
    let response = await FedimintFfi.rpc('listTransactions', payload)
    return handleRpcResponse<Transaction[]>(response)
}

export async function joinFederation(
    connectString: string,
): Promise<Federation> {
    let payload = JSON.stringify({ connectString })
    let response = await FedimintFfi.rpc('joinFederation', payload)
    return handleRpcResponse<Federation>(response)
}

export async function listFederations(): Promise<Federation[]> {
    let payload = JSON.stringify({}) // FIXME
    let response = await FedimintFfi.rpc('listFederations', payload)
    console.log(response)
    console.log(JSON.parse(response).result[0].nodes)
    return handleRpcResponse<Federation[]>(response)
}

export async function generateInvoice(
    amount: number,
    description: string,
    federationId: string,
): Promise<string> {
    let payload = JSON.stringify({
        amount,
        description,
        federationId,
    })
    let response = await FedimintFfi.rpc('generateInvoice', payload)
    return handleRpcResponse<string>(response)
}

export async function decodeInvoice(invoice: string): Promise<Invoice> {
    let payload = JSON.stringify({ invoice })
    let response = await FedimintFfi.rpc('decodeInvoice', payload)
    return handleRpcResponse<Invoice>(response)
}

export async function payInvoice(invoice: string, federationId: string) {
    let payload = JSON.stringify({ invoice, federationId })
    let response = await FedimintFfi.rpc('payInvoice', payload)
    return handleRpcResponse<null>(response)
}

export async function generateAddress(federationId: string): Promise<string> {
    let payload = JSON.stringify({ federationId })
    let response = await FedimintFfi.rpc('generateAddress', payload)
    return handleRpcResponse<string>(response)
}

export async function payAddress(
    address: string,
    sats: number,
    federationId: string,
): Promise<string> {
    let payload = JSON.stringify({
        address,
        sats,
        federationId,
    })
    let response = await FedimintFfi.rpc('payAddress', payload)
    return handleRpcResponse<string>(response)
}

export async function init(dataDir: string) {
    return FedimintFfi.init(dataDir)
}

export async function generateEcash(
    amount: number,
    federationId: string,
): Promise<string> {
    let payload = JSON.stringify({ federationId, amount })
    let response = await FedimintFfi.rpc('generateEcash', payload)
    return handleRpcResponse<string>(response)
}

export async function receiveEcash(
    ecash: string,
    federationId: string,
): Promise<ReceiveEcashResponse> {
    let payload = JSON.stringify({ federationId, ecash: JSON.parse(ecash) })
    let response = await FedimintFfi.rpc('receiveEcash', payload)
    return handleRpcResponse<ReceiveEcashResponse>(response)
}

export async function validateEcash(
    ecash: string,
    federationId: string,
): Promise<ValidateEcashResponse> {
    let payload = JSON.stringify({ federationId, ecash: JSON.parse(ecash) })
    let response = await FedimintFfi.rpc('validateEcash', payload)
    return handleRpcResponse<ValidateEcashResponse>(response)
}

/*
 * Mocked-out seed backup and recovery methods
 */
export type SeedWords = string[]

export async function generateMnemonic(
    _federationId: string,
): Promise<SeedWords> {
    return new Promise(resolve => {
        resolve([
            'never',
            'gonna',
            'give',
            'you',
            'up',
            'never',
            'gonna',
            'let',
            'you',
            'down',
            'never',
            'gonna',
        ])
    })
}

// progress reported via `SeedRecoveryEvent` events
export async function recoverFromMnemonic(
    _federationId: string,
    _mnemonic: string[],
): Promise<null> {
    return new Promise(resolve => {
        setTimeout(() => resolve(null), 1000)
    })
}

/*
 * Mocked-out seed backup and recovery events
 */

export type SeedRecoveryEvent =
    | { type: 'progress'; percentComplete: number }
    | { type: 'failed' }
    | { type: 'complete' }

/*
 * Mocked-out social backup and recovery methods
 */

export async function uploadBackupFile(
    _federationId: string,
    _contents: string,
): Promise<string> {
    return new Promise(resolve => {
        resolve('/path/to/backup.fedi')
    })
}

export async function locateRecoveryFile(
    _federationId: string,
): Promise<string> {
    // TODO: Replace mocked function when bridge is ready
    // let payload = JSON.stringify({ federationId })
    // let response = await FedimintFfi.rpc('locateRecoveryFile', payload)
    // return handleRpcResponse<string>(response)

    // Simulate success/failure modes
    return handleRpcResponse<string>('{"result": "/path/to/backup.fedi"}')
    // return handleRpcResponse<string>('{"error": "no social backup file found"}')
}

export async function validateBackupFile(
    _federationId: string,
    _contents: string,
): Promise<boolean> {
    // TODO: Replace mocked function when bridge is ready
    // let payload = JSON.stringify({ federationId, contents })
    // let response = await FedimintFfi.rpc('validateBackupFile', payload)
    // return handleRpcResponse<boolean>(response)

    // Simulate success/failure modes
    return handleRpcResponse<boolean>('{"result": "true"}')
    // return handleRpcResponse<boolean>('{"error": "invalid recovery file"}')
}

// This string contains a public key and URL to video file
export async function backupQr(_federationId: string): Promise<string> {
    return new Promise(resolve => {
        resolve('socialrecovery:pubkey:videourl')
    })
}

// guardian fetches `_secret` (somehow) from federation admin web UI
export async function authenticateGuardian(
    _federationId: string,
    _secret: string,
): Promise<null> {
    // TODO: Replace mocked function when bridge is ready
    // let payload = JSON.stringify({ federationId, secret })
    // let response = await FedimintFfi.rpc('authenticateGuardian', payload)
    // return handleRpcResponse<boolean>(response)

    // Simulate success/failure modes
    return handleRpcResponse<null>('{"result": "null"}')
    // return handleRpcResponse<boolean>('{"error": "invalid secret"}')
}

// `_userPublicKey` is what guardian decryption shares are threshold-encrypted to
export async function rejectSocialRecoveryRequest(
    _federationId: string,
    _userPublicKey: string,
): Promise<null> {
    return new Promise(resolve => {
        resolve(null)
    })
}

// `_userPublicKey` is what guardian decryption shares are threshold-encrypted to
export async function approveSocialRecoveryRequest(
    _federationId: string,
    _userPublicKey: string,
): Promise<null> {
    return new Promise(resolve => {
        resolve(null)
    })
}

/*
 * Mocked-out social backup and recovery events
 */

enum GuardianApprovalStatus {
    approved = 'approved',
    denied = 'denied',
    pending = 'pending',
}

export type Guardian = {
    name: string
}

export type GuardianApproval = {
    guardian: Guardian
    status: GuardianApprovalStatus
}

export type SocialRecoveryStatus =
    | { type: 'failed' }
    | { type: 'complete' }
    | { type: 'pending'; approvalsRemaining: number }

export type SocialRecoveryEvent = {
    federationId: string
    approvals: GuardianApproval[]
    status: SocialRecoveryStatus
}
