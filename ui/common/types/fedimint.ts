import { MSats } from './units'

export type LogEvent = {
    log: string
}

export type FederationEvent = Federation

export type RecoveredUsername = string | null

export interface TransactionEvent {
    federationId: string
    transaction: Transaction
}

export interface ValidateEcashResponse {
    amount: MSats
    valid: boolean
}

export interface ReceiveEcashResponse {
    amount: MSats
}

export interface LnurlSignedMessage {
    signature: string
    pubkey: string
}

export interface Invoice {
    paymentHash: string
    amount: MSats
    description: string
    invoice: string
    fee: null | MSats
}

export interface LightningGateway {
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

export interface LightningTransactionDetails {
    invoice: string
    fee: MSats | null
}

export interface BitcoinTransactionDetails {
    address: string
    txid: string
    fee: MSats | null
    incomingStatus: IncomingBitcoinTransactionStatus | null
}

export interface OfflineTransactionDetails {
    claimed: boolean
}

export interface XmppCredentials {
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

export interface SocialRecoveryQrCode {
    recoveryId: string
}

export interface Node {
    name: string
    url: string
}

export interface Guardian extends Node {
    peerId: number
    password: string
}

export interface FederationCredentials {
    username: string
    password: string
    keypairSeed: string
}

export interface Federation {
    id: string
    name: string
    connectInfo: string
    nodes: Node[]
    balance: MSats
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
