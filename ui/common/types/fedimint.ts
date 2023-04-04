import { MSats } from './units'

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
    keypairSeed: string
}

export interface Transaction {
    id: string
    createdAt: number
    direction: TransactionDirection
    amount: MSats
    notes: string
    bitcoin: BitcoinTransactionDetails | null
    lightning: LightningTransactionDetails | null
    offline: OfflineTransactionDetails | null
}

export enum AddressOrInvoice {
    address = 'address',
    invoice = 'invoice',
}

export type SocialRecoveryQrCode = {
    recoveryId: string
}

export interface Node {
    name: string
    url: string
}

export interface Guardian {
    peerId: number
    password: string
}

export interface Federation {
    name: string
    connectInfo: string
    nodes: Node[]
    balance: MSats
    // Leaving this on the federation object for now
    // until/unless we find a better place...
    // used for XMPP login for chat features
    username?: string | null
    password?: string | null
    keypairSeed?: string | null
    socialRecoveryActive: boolean
}

export type SeedWords = string[]

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
