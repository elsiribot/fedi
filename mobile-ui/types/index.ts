import { jid } from '@xmpp/client'
import { JID } from '@xmpp/jid'
import { ImageSourcePropType } from 'react-native'
import { SiteImages } from '../assets/images'

import { Invoice } from '../bridge'
import { DEFAULT_GROUP_NAME } from '../constants'
import i18n from '../localization/i18n'
import { RootStackParamList } from './navigation'

export default class Base {
    constructor(data?: any) {
        Object.keys(data).forEach((field: any) => {
            // @ts-ignore
            this[field] = data[field]
        })
    }
}

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

export enum ShortcutType {
    site = 'site',
    screen = 'screen',
}
export type ShortcutIcon = {
    svg?: string
    url?: string
    image?: ImageSourcePropType
}
export class Shortcut extends Base {
    title: string
    description?: string
    icon: ShortcutIcon
    type: ShortcutType
    color?: string
}
export class Site extends Shortcut {
    id: string
    type = ShortcutType.site
    url: string
    constructor(data: any) {
        super(data)
        this.icon = {
            image: SiteImages[data.id],
        }
    }
}
export class Screen extends Shortcut {
    type = ShortcutType.screen
    screenName: keyof RootStackParamList
}

// This is an implementation of an opaque type
// since they are not natively supported in Typescript
type BitcoinUnit<K, T> = K & { _: T }
type FiatUnit<K, T> = K & { _: T }

export type Btc = BitcoinUnit<number, 'Btc'>
export type Sats = BitcoinUnit<number, 'Sats'>
export type MSats = BitcoinUnit<number, 'MSats'>
export type BtcString = BitcoinUnit<string, 'BtcString'>
export type SatsString = BitcoinUnit<string, 'SatsString'>
export type MsatsString = BitcoinUnit<string, 'MsatsString'>
export type Usd = FiatUnit<number, 'Usd'>
export type UsdString = FiatUnit<string, 'UsdString'>

// Chat features
export type FediGroupLink = string
export enum ChatType {
    direct = 'direct',
    group = 'group',
}
export class Chat extends Base {
    id: string
    name?: string
    icon?: string
    pinned?: boolean
    hasNewMessages?: boolean
    messagePreview?: string
    lastReceivedTimestamp?: number
    members?: Member[]
    type: ChatType

    constructor(data: any) {
        super(data)
        if (data.members) this.members = this.members?.map(m => new Member(m))
    }
}
export class Group extends Chat {
    description?: string
    settings?: GroupSettings
    invitationCode?: FediGroupLink

    // TODO: Harden this encoding scheme (use standard URL params?)
    static encodeInvitationLink(id: string): string {
        return `fedi:group:${id}:::`
    }
    static decodeInvitationLink(link: string): Group {
        const afterPrefix = link.split('fedi:group:')[1]
        let groupId = afterPrefix.slice(0, -3)

        // handle old group invite codes for backwards compatibility
        // new group codes have 3 trailing colons `:::` after the group ID
        const encodingSuffix = afterPrefix.slice(-3)
        if (encodingSuffix !== ':::') {
            groupId = afterPrefix
        }

        if (!groupId) throw new Error(i18n.t('feature.chat.invalid-group'))

        return new Group({
            id: groupId,
            name: DEFAULT_GROUP_NAME,
            invitationCode: Group.encodeInvitationLink(groupId),
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
    updatedAt?: number
    memo?: string
    token?: string
    invoice?: Invoice
    constructor(data: any) {
        super(data)
        if (data.recipient) this.recipient = new Member(data.recipient)
    }
}

export enum PaymentStatus {
    accepted,
    requested,
    canceled,
    rejected,
    paid,
}

export type ArchiveQueryFilters = {
    withJid?: string | null
}

export type ArchiveQueryPagination = {
    limit?: string | null
    after?: string | null
}

export type MessageArchiveQuery = {
    filters?: ArchiveQueryFilters | null
    pagination?: ArchiveQueryPagination | null
}
