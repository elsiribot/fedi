import { MSats, MsatsString } from './units'

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

export interface NodeMap {
    [index: string]: Node
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

export enum SupportedCurrency {
    USD = 'USD',
    EUR = 'EUR',
    CFA = 'CFA',
}

export enum SupportedFeature {
    default_currency = 'default_currency',
    chat_server_domain = 'chat_server_domain',
    invite_codes_disabled = 'invite_codes_disabled',
    social_recovery_disabled = 'social_recovery_disabled',
    offline_wallet_disabled = 'offline_wallet_disabled',
    onchain_deposits_disabled = 'onchain_deposits_disabled',
    max_invoice_msats = 'max_invoice_msats',
}

export interface ClientConfigMetadata {
    chat_server_domain?: string
    default_currency?: SupportedCurrency
    // TODO: client config meta only supports strings currently so
    // will need to refactor these:
    // 1. switch to boolean true/false
    invite_codes_disabled?: string
    social_recovery_disabled?: string
    offline_wallet_disabled?: string
    onchain_deposits_disabled?: string
    // 2. switch to MSats (number)
    max_invoice_msats?: MsatsString
    // 3. Site[]
    sites?: string
}

export interface Federation {
    id: string
    name: string
    connectInfo: string
    nodes: NodeMap
    balance: MSats
    socialRecoveryActive: boolean
    meta: ClientConfigMetadata
}

export type SeedWords = string[]

export interface Site {
    id: string
    title: string
    url: string
    description?: string
    color?: string
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

// Map of event type name -> event data
export interface FedimintBridgeEventMap {
    log: LogEvent
    federation: FederationEvent
    transaction: TransactionEvent
    socialRecovery: SocialRecoveryEvent
    recoveryFileCreation: RecoveryFileCreationEvent
}
