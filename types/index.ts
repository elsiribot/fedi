import { JID } from '@xmpp/jid'
import { ImageSourcePropType } from 'react-native'

import Base, { Invoice } from '../bridge'
import { DEFAULT_ROOM_NAME } from '../constants'
import i18n from '../localization/i18n'

export enum BitcoinOrLightning {
    bitcoin = 'bitcoin',
    lightning = 'lightning',
}

export type QueryParams = {
    [key: string]: string
}
export class BtcLnUri extends Base {
    type: BitcoinOrLightning | null
    body: string
    paramsString: string | null
    get queryParams(): QueryParams | null {
        if (this.paramsString == null) return null

        const result: QueryParams = {}
        this.paramsString.split('&').forEach(p => {
            const [key, value] = p.split('=')
            result[key] = value
        })
        return result
    }
    get fullString(): string | null {
        const prefix = this.type ? `${this.type}:` : ''
        const params = this.paramsString ? `?${this.paramsString}` : ''
        return `${prefix}${this.body}${params}`
    }
}

export type Site = {
    id: string
    url: string
    title: string
    description: string
}

// This is an implementation of an opaque type
// since they are not natively supported in Typescript
type BitcoinUnit<K, T> = K & { _: T }

export type Btc = BitcoinUnit<number, 'Btc'>
export type Sats = BitcoinUnit<number, 'Sats'>
export type MSats = BitcoinUnit<number, 'MSats'>
export type BtcString = BitcoinUnit<string, 'BtcString'>
export type SatsString = BitcoinUnit<string, 'SatsString'>
export type MsatsString = BitcoinUnit<string, 'MsatsString'>

// Community features
export type FediRoomLink = string

export class Room extends Base {
    id: string
    icon?: ImageSourcePropType
    name?: string
    description?: string
    hasNewMessages?: boolean
    pinned?: boolean
    settings?: RoomSettings
    // TODO: What exactly is encoded in this invitationCode?
    invitationCode?: FediRoomLink

    // Consider MessagePreview type:
    lastMessage?: MessagePreview
    // or simplify:
    messagePreview?: string
    lastReceivedTimestamp?: number

    constructor(data: any) {
        super(data)
    }

    static encodeInvitationLink(id: string, name: string): string {
        return `fedi:room:${id}::${name}`
    }
    static decodeInvitationLink(link: string): Room {
        const contents = link.split('fedi:room:')[1]
        if (!contents) throw new Error(i18n.t('errors.unknown-error'))

        // TODO: Harden this encoding scheme (use standard URL params?)
        const id = contents.split('::')[0]
        const name = contents.split('::')[1] || DEFAULT_ROOM_NAME

        return new Room({
            id,
            name,
            invitationCode: link,
        })
    }
}

// The only other use case I can imagine for this
// would be for very large Messages where a MessagePreview
// could be sent first before "expanding" it and requesting
// the full Message?
export type MessagePreview = {
    text: string
    timestamp: number
    messageId?: string
}

// Consider combining members and admins?
export type RoomSettings = {
    members: Member[]
    // What can admins do that members can't (if anything)?
    // Enable payments? Show message history?
    // Consider instead a "creator: Member" field here
    admins: Member[]
    paymentsEnabled: boolean
    // Consider instead a shareMessageHistory boolean
    // because each Member would request and store any Messages
    // from other Members upon joining a Room
    showMessageHistory: boolean
}

export class Member extends Base {
    jid: JID
    get username(): string {
        return this.jid.local
    }
}

export class Message extends Base {
    id?: string
    content: string
    sentAt?: number
    receivedAt?: number
    sentBy?: Member
    sentIn?: Room
    actions?: MessageAction[]
    payment?: Payment
}

// This is for embedding action buttons within messages
// May need to make stricter types for this...
export type MessageAction = {
    text: string
    handler: () => {}
}

export class Payment extends Base {
    amount: MSats
    status: PaymentStatus
    memo?: string
    token?: string
    invoice?: Invoice
}

export enum PaymentStatus {
    requested,
    canceled,
    rejected,
    paid,
}
