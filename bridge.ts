import {
    EmitterSubscription,
    NativeEventEmitter,
    NativeModules,
} from 'react-native'
import { Member, Message, MSats, Room, Sats } from './types'

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
    balance: MSats
}

export type TransactionEvent = {
    federationId: string
    transaction: Transaction
}

export type ValidateEcashResponse = {
    amount: MSats
    valid: boolean
}

export type ReceiveEcashResponse = {
    amount: MSats
}

export type LnurlSignedMessage = {
    signature: string
    pubkey: string
}

export type Invoice = {
    paymentHash: string
    amount: MSats
    description: string
    invoice: string
    fee: null | MSats
}

export type LightningGateway = {
    mintPubKey: string
    nodePubKey: string
    api: string
    active: boolean
}

export enum TransactionDirection {
    send = 'send',
    receive = 'receive',
}

export enum IncomingBitcoinTransactionStatus {
    pending = 'pending',
    complete = 'complete',
}

export type LightningTransactionDetails = {
    invoice: string
    fee: MSats | null
}

export type BitcoinTransactionDetails = {
    address: string
    txid: string
    fee: MSats | null
    incomingStatus: IncomingBitcoinTransactionStatus | null
}

export type OfflineTransactionDetails = {
    claimed: boolean
}

export class Transaction extends Base {
    id: string
    createdAt: number
    direction: TransactionDirection
    amount: MSats
    notes: string
    bitcoin: BitcoinTransactionDetails | null
    lightning: LightningTransactionDetails | null
    offline: OfflineTransactionDetails | null
    get fee(): MSats | null {
        if (this.bitcoin !== null) return this.bitcoin.fee
        if (this.lightning !== null) return this.lightning.fee
        if (this.offline !== null) return null
        throw 'invalid transaction'
    }
}

export enum AddressOrInvoice {
    address = 'address',
    invoice = 'invoice',
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
        // Remove any existing listeners of this eventType before adding
        this.removeListener(eventType)

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

    onTransaction = (
        listener: (event: TransactionEvent) => void,
        context?: Object,
    ): EmitterSubscription => {
        return this.addListener('transaction', listener, context)
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
    balance: MSats
    // Leaving this on the federation object for now
    // until/unless we find a better place...
    // used for XMPP login for chat/community features
    username?: string | null
    rooms?: Room[] | null
    messages?: Message[] | null
    membersSeen?: Member[] | null

    get approvalsRequired(): number {
        const numNodes = this.nodes.length
        return numNodes - Math.floor((numNodes - 1) / 3)
    }
    get denialThreshold(): number {
        const numNodes = this.nodes.length
        return Math.floor((numNodes - 1) / 3)
    }
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

export async function updateTransactionNotes(
    transactionId: string,
    notes: string,
    federationId: string,
): Promise<null> {
    let payload = JSON.stringify({ federationId, transactionId, notes })
    let response = await FedimintFfi.rpc('updateTransactionNotes', payload)
    return handleRpcResponse<null>(response)
}

export async function joinFederation(
    connectString: string,
): Promise<Federation> {
    let payload = JSON.stringify({ connectString })
    let response = await FedimintFfi.rpc('joinFederation', payload)
    return handleRpcResponse<Federation>(response)
}

export async function dangerousLeaveFederation(
    federationId: string,
): Promise<null> {
    let payload = JSON.stringify({ federationId })
    let response = await FedimintFfi.rpc('dangerousLeaveFederation', payload)
    return handleRpcResponse<null>(response)
}

export async function listFederations(): Promise<Federation[]> {
    let payload = JSON.stringify({}) // FIXME
    let response = await FedimintFfi.rpc('listFederations', payload)
    return handleRpcResponse<Federation[]>(response)
}

export async function generateInvoice(
    amount: MSats,
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

export async function addressOrInvoice(
    input: string,
    federationId: string,
): Promise<AddressOrInvoice> {
    let payload = JSON.stringify({ federationId, input })
    let response = await FedimintFfi.rpc('addressOrInvoice', payload)
    return handleRpcResponse<AddressOrInvoice>(response)
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
    sats: Sats,
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

export async function lnurlSignMessage(
    message: string,
    federationId: string,
): Promise<LnurlSignedMessage> {
    let payload = JSON.stringify({ message, federationId })
    let response = await FedimintFfi.rpc('lnurlSignMessage', payload)
    return handleRpcResponse<LnurlSignedMessage>(response)
}

export async function listGateways(
    federationId: string,
): Promise<LightningGateway[]> {
    let payload = JSON.stringify({ federationId })
    let response = await FedimintFfi.rpc('listGateways', payload)
    return handleRpcResponse<LightningGateway[]>(response)
}

export async function switchGateway(
    gateway: LightningGateway,
    federationId: string,
): Promise<null> {
    // FIXME: annoying how nodePubkey has 2 different forms of casing ...
    let payload = JSON.stringify({
        federationId,
        nodePubkey: gateway.nodePubKey,
    })
    let response = await FedimintFfi.rpc('switchGateway', payload)
    return handleRpcResponse<null>(response)
}

/*
 * Mocked-out seed backup and recovery methods
 */
export type SeedWords = string[]

export async function getMnemonic(federationId: string): Promise<SeedWords> {
    let payload = JSON.stringify({ federationId })
    let response = await FedimintFfi.rpc('getMnemonic', payload)
    return handleRpcResponse<SeedWords>(response)
}

// progress reported via `SeedRecoveryEvent` events
export async function recoverFromMnemonic(
    _mnemonic: string[],
    _federationId: string,
): Promise<null> {
    // TODO: Replace mocked function when bridge is ready
    // let payload = JSON.stringify({ mnemonic, federationId })
    // let response = await FedimintFfi.rpc('recoverFromMnemonic', payload)
    // return handleRpcResponse<string>(response)

    // Simulate recovery with success/failure modes
    await new Promise(r => setTimeout(r, 2000))
    return handleRpcResponse<null>('{"result": "null"}')
    // return handleRpcResponse<null>('{"error": "seed is invalid"}')
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
    _contents: string,
    _federationId: string,
): Promise<string> {
    // TODO: Replace mocked function when bridge is ready
    // let payload = JSON.stringify({ federationId, contents })
    // let response = await FedimintFfi.rpc('uploadBackupFile', payload)
    // return handleRpcResponse<string>(response)

    // Simulate success/failure modes
    return handleRpcResponse<string>('{"result": "/path/to/backup.fedi"}')
    // return handleRpcResponse<string>('{"error": "error creating social backup file"}')
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
    _contents: string,
    _federationId: string,
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
    // TODO: Replace mocked function when bridge is ready
    // let payload = JSON.stringify({ federationId })
    // let response = await FedimintFfi.rpc('backupQr', payload)
    // return handleRpcResponse<string>(response)

    // Simulate success/failure modes
    const SAMPLE_VIDEO_URL =
        'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4'
    return handleRpcResponse<string>(
        `{"result": "socialrecovery::pubkey::${SAMPLE_VIDEO_URL}"}`,
    )
    // return handleRpcResponse<string>('{"error": "no social backup QR code found"}')
}

// guardian fetches `_secret` (somehow) from federation admin web UI
export async function authenticateGuardian(
    _secret: string,
    _federationId: string,
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
export async function denySocialRecoveryRequest(
    _userPublicKey: string,
    _federationId: string,
): Promise<null> {
    // TODO: Replace mocked function when bridge is ready
    // let payload = JSON.stringify({ federationId, userPublicKey })
    // let response = await FedimintFfi.rpc('denySocialRecoveryRequest', payload)
    // return handleRpcResponse<null>(response)

    // Simulate success/failure modes
    return handleRpcResponse<null>('{"result": "null"}')
    // return handleRpcResponse<null>('{"error": "social recovery denial failed"}')
}

// `_userPublicKey` is what guardian decryption shares are threshold-encrypted to
export async function approveSocialRecoveryRequest(
    _userPublicKey: string,
    _federationId: string,
): Promise<null> {
    // TODO: Replace mocked function when bridge is ready
    // let payload = JSON.stringify({ federationId, userPublicKey })
    // let response = await FedimintFfi.rpc('approveSocialRecoveryRequest', payload)
    // return handleRpcResponse<null>(response)

    // Simulate success/failure modes
    return handleRpcResponse<null>('{"result": "null"}')
    // return handleRpcResponse<null>('{"error": "social recovery approval failed"}')
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

export type RecoveryFileCreationEvent =
    | { type: 'progress'; percentComplete: number }
    | { type: 'failed'; errorCode: string }
    | { type: 'complete' }

// For the Community feature, the user needs to authenticate with
// a password automatically derived from their seed/privkey
export async function generateCommunitySecret(
    _federationId: string,
    _username: string,
): Promise<string> {
    // TODO: Replace mocked function when bridge is ready
    // let payload = JSON.stringify({ federationId, username })
    // let response = await FedimintFfi.rpc('generateCommunitySecret', payload)
    // return handleRpcResponse<string>(response)

    return handleRpcResponse<string>('{"result": "abcdefg1234567"}')
    // return handleRpcResponse<null>('{"error": "error generating secret"}')
}
