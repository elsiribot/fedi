import { MSats, MsatsString } from './units'
import { LogEvent, RpcFederation, RpcInvoice, RpcLightningGateway, RpcResponse, SocialRecoveryEvent, RpcTransaction } from './bindings'

export type Invoice = RpcInvoice
export type LightningGateway = RpcLightningGateway

export enum TransactionDirection {
    send = 'send',
    receive = 'receive',
}

export enum IncomingBitcoinTransactionStatus {
    pending = 'pending',
    complete = 'complete',
}

export interface MockBitcoinTransactionDetails {
    address: string
    txid: string
    fee: MSats | null
    incomingStatus: IncomingBitcoinTransactionStatus | null
}

export type Transaction = RpcTransaction & {
    bitcoin: MockBitcoinTransactionDetails
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
    CZK = 'CZK',
}

export enum SupportedFeature {
    default_currency = 'default_currency',
    fixed_exchange_rate = 'fixed_exchange_rate',
    chat_server_domain = 'chat_server_domain',
    invite_codes_disabled = 'invite_codes_disabled',
    new_members_disabled = 'new_members_disabled',
    social_recovery_disabled = 'social_recovery_disabled',
    offline_wallet_disabled = 'offline_wallet_disabled',
    onchain_deposits_disabled = 'onchain_deposits_disabled',
    max_balance_msats = 'max_balance_msats',
    max_invoice_msats = 'max_invoice_msats',
}

export interface ClientConfigMetadata {
    federation_name?: string
    // If this exists, we use it to download a JSON file that overrides
    // te use of any other fields below
    meta_external_url?: string
    // these are support config fields that change app behavior per-federation
    chat_server_domain?: string
    default_currency?: SupportedCurrency
    welcome_message?: string
    tos_url?: string
    federation_icon_url?: string
    popup_countdown_message?: string
    popup_ended_message?: string
    // TODO: client config meta only supports strings currently so
    // will need to refactor these:
    // 1. switch to boolean true/false
    invite_codes_disabled?: string
    new_members_disabled?: string
    social_recovery_disabled?: string
    offline_wallet_disabled?: string
    onchain_deposits_disabled?: string
    // 2. switch to MSats (number)
    max_invoice_msats?: MsatsString
    max_balance_msats?: MsatsString
    // 3. FediMod[]
    sites?: string
    // 4. Switch to number (unix epoch timestamp)
    /** Timestamp that popup federations will be completely disabled at */
    popup_end_timestamp?: string
    // 5. string[] - array of group IDs
    default_group_chats?: string
    // 6. Switch to number
    fixed_exchange_rate?: string
}

export enum Network {
    bitcoin = 'bitcoin',
    testnet = 'testnet',
    signet = 'signet',
    regtest = 'regtest',
}

export type Federation = RpcFederation & { meta: ClientConfigMetadata }

export type SeedWords = RpcResponse<'getMnemonic'>

export interface FediMod {
    id: string
    title: string
    url: string
    imageUrl?: string
    description?: string
    color?: string
}

export interface FederationApiVersion {
    major: number
    minor: number
}

export interface FederationPreview {
    id: Federation['id']
    name: Federation['name']
    meta: Federation['meta']
    connectionCode: string
    consensusVersion: number
    apiVersion: FederationApiVersion
}

/*
 * Mocked-out social backup and recovery events
 */

export type FederationEvent = Federation

export interface TransactionEvent {
    federationId: string
    transaction: Transaction
}

// Map of event type name -> event data
export type FedimintBridgeEventMap = {
    log: LogEvent
    federation: FederationEvent
    transaction: TransactionEvent
    socialRecovery: SocialRecoveryEvent
}
