import { Invoice } from './fedimint'
import { Btc } from './units'

export enum QRDataType {
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

interface QRData<T extends string, D = null> {
    type: T
    data: D
}

export type QRDataBolt11 = QRData<
    QRDataType.Bolt11,
    { bolt11: string } & Invoice
>

export type QRDataBolt12 = QRData<QRDataType.Bolt12>

export type QRDataLnurlPay = QRData<
    QRDataType.LnurlPay,
    {
        domain: string
        callback: string
        metadata: string[][]
        maxSendable?: number
        minSendable?: number
    }
>

export type QRDataLnurlWithdraw = QRData<
    QRDataType.LnurlWithdraw,
    {
        domain: string
        callback: string
        k1: string
        defaultDescription?: string
        minWithdrawable?: number
        maxWithdrawable?: number
    }
>

export type QRDataLnurlAuth = QRData<
    QRDataType.LnurlAuth,
    {
        domain: string
        callback: string
        k1: string
        action?: 'register' | 'login' | 'link' | 'auth'
    }
>

export type QRDataBitcoinAddress = QRData<
    QRDataType.BitcoinAddress,
    {
        address: string
    }
>

export type QRDataBip21 = QRData<
    QRDataType.Bip21,
    {
        address: string
        amount?: Btc
        label?: string
        message?: string
        lightning?: QRDataBolt11['data']
    }
>

export type QRDataFedimintEcash = QRData<QRDataType.FedimintEcash, null>

export type QRDataFederationInvite = QRData<
    QRDataType.FedimintInvite,
    {
        invite: string
    }
>

export type QRDataFediChatMember = QRData<
    QRDataType.FediChatMember,
    { id: string }
>

export type QRDataFediChatGroup = QRData<
    QRDataType.FediChatGroup,
    { id: string }
>

export type QRDataUnknown = QRData<QRDataType.Unknown, { message: string }>

export type AnyQRData =
    | QRDataBolt11
    | QRDataBolt12
    | QRDataLnurlPay
    | QRDataLnurlWithdraw
    | QRDataLnurlAuth
    | QRDataBitcoinAddress
    | QRDataBip21
    | QRDataFedimintEcash
    | QRDataFederationInvite
    | QRDataFediChatMember
    | QRDataFediChatGroup
    | QRDataUnknown
