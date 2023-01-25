import { jid } from '@xmpp/client'
import { JID } from '@xmpp/jid'
import { ImageSourcePropType } from 'react-native'

import Base, { Invoice } from '../bridge'
import { DEFAULT_GROUP_NAME } from '../constants'
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
export type FediGroupLink = string

export class Chat extends Base {
    id: string
    name?: string
    icon?: ImageSourcePropType
    pinned?: boolean
    hasNewMessages?: boolean
    messagePreview?: string
    lastReceivedTimestamp?: number
    members?: Member[]

    constructor(data: any) {
        super(data)
        if (data.members) this.members = this.members?.map(m => new Member(m))
    }
}
export class Group extends Chat {
    description?: string
    settings?: GroupSettings
    // TODO: What exactly is encoded in this invitationCode?
    invitationCode?: FediGroupLink

    static encodeInvitationLink(id: string, name: string): string {
        return `fedi:group:${id}::${name}`
    }
    static decodeInvitationLink(link: string): Group {
        const contents = link.split('fedi:group:')[1]
        if (!contents) throw new Error(i18n.t('errors.unknown-error'))

        // TODO: Harden this encoding scheme (use standard URL params?)
        const id = contents.split('::')[0]
        const name = contents.split('::')[1] || DEFAULT_GROUP_NAME

        return new Group({
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
export type GroupSettings = {
    members: Member[]
    // What can admins do that members can't (if anything)?
    // Enable payments? Show message history?
    // Consider instead a "creator: Member" field here
    admins: Member[]
    paymentsEnabled: boolean
    // Consider instead a shareMessageHistory boolean
    // because each Member would request and store any Messages
    // from other Members upon joining a Group
    showMessageHistory: boolean
}

export class Member extends Base {
    jid: JID
    constructor(data: any) {
        super(data)
        this.jid = jid(data.jid._local, data.jid._domain, data.jid._resource)
    }
    get username(): string {
        return this.jid.getLocal()
    }
}

export class Message extends Base {
    id?: string
    content: string
    sentAt?: number
    receivedAt?: number
    sentIn?: Group
    sentBy?: Member
    sentTo?: Member
    actions?: MessageAction[]
    payment?: Payment
    constructor(data: any) {
        super(data)
        if (data.sentIn) this.sentIn = new Group(data.sentIn)
        if (data.sentBy) this.sentBy = new Member(data.sentBy)
        if (data.sentTo) this.sentTo = new Member(data.sentTo)
        if (data.payment) this.payment = new Payment(data.payment)
    }
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
    recipient?: Member
    memo?: string
    token?: string
    invoice?: Invoice
    constructor(data: any) {
        super(data)
        if (data.recipient) this.recipient = new Member(data.recipient)
    }
}

export enum PaymentStatus {
    requested,
    canceled,
    rejected,
    paid,
}
