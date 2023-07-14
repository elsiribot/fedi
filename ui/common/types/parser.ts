import { Invoice } from './fedimint'
import { Btc } from './units'

export enum ParserDataType {
    Bolt11 = 'lightning:bolt11',
    Bolt12 = 'lightning:bolt12',
    LnurlPay = 'lnurl:pay',
    LnurlWithdraw = 'lnurl:withdraw',
    LnurlAuth = 'lnurl:auth',
    BitcoinAddress = 'bitcoin:address',
    Bip21 = 'bitcoin:bip21',
    FedimintEcash = 'fedimint:ecash',
    FedimintInvite = 'fedimint:invite',
    FediChatMember = 'fedi:chatmember',
    FediChatGroup = 'fedi:chatgroup',
    Unknown = 'unknown',
}

interface ParsedData<T extends string, D = null> {
    type: T
    data: D
}

export type ParsedBolt11 = ParsedData<
    ParserDataType.Bolt11,
    { bolt11: string; fallbackAddress?: string } & Invoice
>

// No data since we don't yet support bolt 12, so no point in fully parsing.
export type ParsedBolt12 = ParsedData<ParserDataType.Bolt12>

export type ParsedLnurlPay = ParsedData<
    ParserDataType.LnurlPay,
    {
        domain: string
        callback: string
        /** Array of raw metadata arrays, [0] is mimeType and [1] is content */
        metadata: string[][]
        /** Short description parsed from metadata, should fit one line */
        description?: string
        /** Long description parsed from metadata, may contain line breaks */
        longDescription?: string
        /** Base64 PNG or JPEG thumbnail */
        thumbnail?: string
        maxSendable?: number
        minSendable?: number
    }
>

export type ParsedLnurlWithdraw = ParsedData<
    ParserDataType.LnurlWithdraw,
    {
        domain: string
        callback: string
        k1: string
        defaultDescription?: string
        minWithdrawable?: number
        maxWithdrawable?: number
    }
>

export type ParsedLnurlAuth = ParsedData<
    ParserDataType.LnurlAuth,
    {
        domain: string
        callback: string
        k1: string
        action?: 'register' | 'login' | 'link' | 'auth'
    }
>

export type ParsedBitcoinAddress = ParsedData<
    ParserDataType.BitcoinAddress,
    {
        address: string
    }
>

export type ParsedBip21 = ParsedData<
    ParserDataType.Bip21,
    {
        address: string
        amount?: Btc
        label?: string
        message?: string
    }
>

export type ParsedFedimintEcash = ParsedData<ParserDataType.FedimintEcash, null>

export type ParsedFederationInvite = ParsedData<
    ParserDataType.FedimintInvite,
    {
        invite: string
    }
>

export type ParsedFediChatMember = ParsedData<
    ParserDataType.FediChatMember,
    { id: string }
>

export type ParsedFediChatGroup = ParsedData<
    ParserDataType.FediChatGroup,
    { id: string }
>

export type ParsedUnknownData = ParsedData<
    ParserDataType.Unknown,
    { message: string }
>

export type AnyParsedData =
    | ParsedBolt11
    | ParsedBolt12
    | ParsedLnurlPay
    | ParsedLnurlWithdraw
    | ParsedLnurlAuth
    | ParsedBitcoinAddress
    | ParsedBip21
    | ParsedFedimintEcash
    | ParsedFederationInvite
    | ParsedFediChatMember
    | ParsedFediChatGroup
    | ParsedUnknownData
