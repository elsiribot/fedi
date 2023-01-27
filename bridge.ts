import {
    EmitterSubscription,
    NativeEventEmitter,
    NativeModules,
} from 'react-native'
import { MSats, Sats } from './types'

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

export type FederationEvent = Federation

export type RecoveredUsername = string | null

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

export type XmppCredentials = {
    password: string
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

export type SocialRecoveryQrCode = {
    recoveryId: string
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
    password?: string | null
    socialRecoveryActive: boolean

    get approvalsRequired(): number {
        const numNodes = this.nodes.length
        return numNodes - Math.floor((numNodes - 1) / 3)
    }
    get denialThreshold(): number {
        const numNodes = this.nodes.length
        return Math.floor((numNodes - 1) / 3)
    }
}

async function fedimintRpc<Type>(
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

export async function listTransactions(
    federationId: string,
): Promise<Transaction[]> {
    return fedimintRpc<Transaction[]>('listTransactions', { federationId })
}

export async function updateTransactionNotes(
    transactionId: string,
    notes: string,
    federationId: string,
): Promise<null> {
    return fedimintRpc('updateTransactionNotes', {
        federationId,
        transactionId,
        notes,
    })
}

export async function joinFederation(
    connectString: string,
): Promise<Federation> {
    return fedimintRpc('joinFederation', { connectString })
}

export async function leaveFederation(federationId: string): Promise<null> {
    return fedimintRpc('leaveFederation', { federationId })
}

export async function listFederations(): Promise<Federation[]> {
    return fedimintRpc('listFederations', {})
}

export async function generateInvoice(
    amount: MSats,
    description: string,
    federationId: string,
): Promise<string> {
    return fedimintRpc('generateInvoice', {
        amount,
        description,
        federationId,
    })
}

export async function decodeInvoice(invoice: string): Promise<Invoice> {
    return fedimintRpc('decodeInvoice', { invoice })
}

export async function addressOrInvoice(
    input: string,
    federationId: string,
): Promise<AddressOrInvoice> {
    return fedimintRpc('addressOrInvoice', { federationId, input })
}

export async function payInvoice(invoice: string, federationId: string) {
    return fedimintRpc('payInvoice', { invoice, federationId })
}

export async function generateAddress(federationId: string): Promise<string> {
    return fedimintRpc('generateAddress', { federationId })
}

export async function payAddress(
    address: string,
    sats: Sats,
    federationId: string,
): Promise<string> {
    return fedimintRpc('payAddress', {
        address,
        sats,
        federationId,
    })
}

export async function initializeBridge(dataDir: string) {
    const logLevel = 'info'
    return FedimintFfi.initialize(dataDir, logLevel)
}

export async function generateEcash(
    amount: number,
    federationId: string,
): Promise<string> {
    return fedimintRpc('generateEcash', { federationId, amount })
}

export async function receiveEcash(
    ecash: string,
    federationId: string,
): Promise<ReceiveEcashResponse> {
    return fedimintRpc('receiveEcash', {
        federationId,
        ecash: JSON.parse(ecash),
    })
}

export async function validateEcash(
    ecash: string,
    federationId: string,
): Promise<ValidateEcashResponse> {
    return fedimintRpc('validateEcash', {
        federationId,
        ecash: JSON.parse(ecash),
    })
}

export async function lnurlSignMessage(
    message: string,
    federationId: string,
): Promise<LnurlSignedMessage> {
    return fedimintRpc('lnurlSignMessage', { message, federationId })
}

export async function getXmppCredentials(
    federationId: string,
): Promise<XmppCredentials> {
    return fedimintRpc('xmppCredentials', { federationId })
}

export async function backupXmppUsername(
    username: String,
    federationId: string,
): Promise<null> {
    return fedimintRpc('backupXmppUsername', { username, federationId })
}

export async function listGateways(
    federationId: string,
): Promise<LightningGateway[]> {
    return fedimintRpc('listGateways', { federationId })
}

export async function switchGateway(
    gateway: LightningGateway,
    federationId: string,
): Promise<null> {
    // FIXME: annoying how nodePubkey has 2 different forms of casing ...
    return fedimintRpc('switchGateway', {
        federationId,
        nodePubkey: gateway.nodePubKey,
    })
}

/*
 * Mocked-out seed backup and recovery methods
 */
export type SeedWords = string[]

export async function getMnemonic(federationId: string): Promise<SeedWords> {
    return fedimintRpc('getMnemonic', { federationId })
}

// progress reported via `SeedRecoveryEvent` events
export async function recoverFromMnemonic(
    mnemonic: string[],
    federationId: string,
): Promise<RecoveredUsername> {
    return fedimintRpc('recoverFromMnemonic', { mnemonic, federationId })
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
    videoFilePath: string,
    federationId: string,
): Promise<null> {
    // FIXME: for some reason rust can't read the file if it has `file://` prefix ...
    videoFilePath = videoFilePath.replace('file://', '')
    return fedimintRpc('uploadBackupFile', { federationId, videoFilePath })
}

export async function locateRecoveryFile(
    federationId: string,
): Promise<string> {
    return fedimintRpc('locateRecoveryFile', { federationId })
}

export async function validateRecoveryFile(
    path: string,
    federationId: string,
): Promise<boolean> {
    console.log('backup file path', path)
    return fedimintRpc('validateRecoveryFile', { federationId, path })
}

// This string contains a public key and URL to video file
export async function recoveryQr(
    federationId: string,
): Promise<SocialRecoveryQrCode> {
    return fedimintRpc('recoveryQr', { federationId })
}

export async function socialRecoveryApprovals(
    federationId: string,
): Promise<SocialRecoveryEvent> {
    return fedimintRpc('socialRecoveryApprovals', { federationId })
}

// guardian fetches `_secret` (somehow) from federation admin web UI
export async function authenticateGuardian(
    _secret: string,
    _federationId: string,
): Promise<null> {
    // Simulate success/failure modes
    return Promise.resolve(null)
    // return Promise.reject('invalid secret')
}

// `_userPublicKey` is what guardian decryption shares are threshold-encrypted to
export async function denySocialRecoveryRequest(
    _userPublicKey: string,
    _federationId: string,
): Promise<null> {
    // Simulate success/failure modes
    return Promise.resolve(null)
    // return Promise.reject('social recovery denial failed')
}

// `_userPublicKey` is what guardian decryption shares are threshold-encrypted to
export async function approveSocialRecoveryRequest(
    recoveryId: string,
    federationId: string,
): Promise<null> {
    return fedimintRpc('approveSocialRecoveryRequest', {
        federationId,
        recoveryId,
    })
}

export async function socialRecoveryDownloadVerificationDoc(
    recoveryId: string,
    federationId: string,
): Promise<string | null> {
    return fedimintRpc('socialRecoveryDownloadVerificationDoc', {
        federationId,
        recoveryId,
    })
}

export async function completeSocialRecovery(
    federationId: string,
): Promise<RecoveredUsername> {
    return fedimintRpc('completeSocialRecovery', { federationId })
}

/*
 * Mocked-out social backup and recovery events
 */

export type GuardianApproval = {
    guardianName: String
    approved: boolean
}

export type SocialRecoveryEvent = {
    federationId: string
    approvals: GuardianApproval[]
    remaining: number
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
    // Simulate success/failure modes
    return Promise.resolve('abcdefg1234567')
    // return Promise.reject('error generating secret')
}
