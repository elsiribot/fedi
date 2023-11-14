import {
    BalanceEvent,
    LogEvent,
    RpcFederation,
    RpcInvoice,
    RpcLightningGateway,
    RpcResponse,
    SocialRecoveryEvent,
    RpcTransaction,
    SocialRecoveryApproval,
    PanicEvent,
    StabilityPoolWithdrawalEvent,
    StabilityPoolDepositEvent,
} from './bindings'
import { MsatsString, Usd, UsdCents } from './units'

export type {
    SocialRecoveryEvent,
    SocialRecoveryApproval as GuardianApproval,
    RpcInvoice as Invoice,
    RpcLightningGateway as LightningGateway,
}
export type SocialRecoveryQrCode = RpcResponse<'recoveryQr'>

export enum TransactionDirection {
    send = 'send',
    receive = 'receive',
}

export type Transaction = RpcTransaction

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
    INR = 'INR',
    IDR = 'IDR',
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
    nostr_enabled = 'nostr_enabled',
}

/**
 * Native [Fedimint Meta Fields](https://github.com/fedimint/fedimint/tree/master/docs/meta_fields#meta-fields)
 */
interface FedimintMetaFields {
    federation_expiry_timestamp?: string
    federation_name?: string
    meta_override_url?: string
    welcome_message?: string
    vetted_gateways?: Array<string>
}

/**
 * Old custom Fedimint metadata fields.
 * @deprecated Migration to `fedi:`-prefixed additional federation medata fields.
 */
interface DeprecatedClientConfigMetadata {
    /**
     * If this exists, we use it to download a JSON file that overrides
     * the use of any other fields below
     * @deprecated Use `fedi:meta_external_url` instead
     */
    meta_external_url?: string
    /**
     * @deprecated Use `fedi:chat_server_domain` instead
     */
    chat_server_domain?: string
    /**
     * @deprecated Use `fedi:default_currency` instead
     */
    default_currency?: SupportedCurrency
    /**
     * @deprecated Use `fedi:tos_url` instead
     */
    tos_url?: string
    /**
     * @deprecated Use `fedi:federation_icon_url` instead
     */
    federation_icon_url?: string
    /**
     * @deprecated Use `fedi:popup_countdown_message` instead
     */
    popup_countdown_message?: string
    /**
     * @deprecated Use `fedi:popup_ended_message` instead
     */
    popup_ended_message?: string
    // TODO: client config meta only supports strings currently so will need to refactor these:
    // TODO: 1. switch to boolean true/false
    /**
     * @deprecated Use `fedi:invite_codes_disabled` instead
     */
    invite_codes_disabled?: string
    /**
     * @deprecated Use `fedi:new_members_disabled` instead
     */
    new_members_disabled?: string
    /**
     * @deprecated Use `fedi:social_recovery_disabled` instead
     */
    social_recovery_disabled?: string
    /**
     * @deprecated Use `fedi:offline_wallet_disabled` instead
     */
    offline_wallet_disabled?: string
    /**
     * @deprecated Use `fedi:onchain_deposits_disabled` instead
     */
    onchain_deposits_disabled?: string
    // TODO: 2. switch to MSats (number)
    /**
     * @deprecated Use `fedi:max_invoice_msats` instead
     */
    max_invoice_msats?: MsatsString
    /**
     * @deprecated Use `fedi:max_balance_msats` instead
     */
    max_balance_msats?: MsatsString
    // TODO: 3. FediMod[]
    /**
     * @deprecated Use `fedi:sites` instead
     */
    sites?: string
    // TODO: 4. Switch to number (unix epoch timestamp)
    /**
     * Timestamp that popup federations will be completely disabled at
     * @deprecated Use `fedi:popup_end_timestamp` instead
     */
    popup_end_timestamp?: string
    // TODO: 5. string[] - array of group IDs
    /**
     * @deprecated Use `fedi:default_group_chats` instead
     */
    default_group_chats?: string
    // TODO: 6. Switch to number
    /**
     * @deprecated Use `fedi:fixed_exchange_rate` instead
     */
    fixed_exchange_rate?: string
}

/**
 * Client config metadata fields.
 */
export interface ClientConfigMetadata
    extends FedimintMetaFields,
        DeprecatedClientConfigMetadata {
    'fedi:meta_external_url'?: string
    'fedi:chat_server_domain'?: string
    'fedi:default_currency'?: SupportedCurrency
    'fedi:tos_url'?: string
    'fedi:federation_icon_url'?: string
    'fedi:popup_countdown_message'?: string
    'fedi:popup_ended_message'?: string
    // TODO: client config meta only supports strings currently so will need to refactor these:
    // TODO: 1. switch to boolean true/false
    'fedi:invite_codes_disabled'?: string
    'fedi:new_members_disabled'?: string
    'fedi:social_recovery_disabled'?: string
    'fedi:offline_wallet_disabled'?: string
    'fedi:onchain_deposits_disabled'?: string
    // TODO: 2. switch to MSats (number)
    'fedi:max_invoice_msats'?: MsatsString
    'fedi:max_balance_msats'?: MsatsString
    // TODO: 3. FediMod[]
    'fedi:sites'?: string
    // TODO: 4. Switch to number (unix epoch timestamp)
    /** Timestamp that popup federations will be completely disabled at */
    'fedi:popup_end_timestamp'?: string
    // TODO: 5. string[] - array of group IDs
    'fedi:default_group_chats'?: string
    // TODO: 6. Switch to number
    'fedi:fixed_exchange_rate'?: string
}

export enum Network {
    bitcoin = 'bitcoin',
    testnet = 'testnet',
    signet = 'signet',
    regtest = 'regtest',
}

export type Federation = Omit<RpcFederation, 'network'> & {
    meta: ClientConfigMetadata
    network: Network
}

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
    balance: BalanceEvent
    panic: PanicEvent
    stabilityPoolDeposit: StabilityPoolDepositEvent
    stabilityPoolWithdrawal: StabilityPoolWithdrawalEvent
}

export type StabilityPoolTxn = {
    id: string
    timestamp: number | null
    amountCents: UsdCents
    amountUsd: Usd
    direction: 'deposit' | 'withdraw'
    status: 'pending' | 'complete'
}
