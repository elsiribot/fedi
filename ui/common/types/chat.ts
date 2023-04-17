import type { Invoice } from './fedimint'
import type { MSats } from './units'

export enum ChatType {
    direct = 'direct',
    group = 'group',
}

export interface Chat {
    /** Unique ID for the chat, random value for groups and user id for DMs */
    id: string
    name?: string
    icon?: string
    pinned?: boolean
    hasNewMessages?: boolean
    members: string[]
    type: ChatType
}

export interface ChatMessage {
    id: string
    content: string
    sentAt: number
    receivedAt?: number
    sentBy: ChatMember['id']
    sentIn?: ChatGroup['id']
    sentTo?: ChatMember['id']
    payment?: ChatPayment
}

export interface ChatPayment {
    amount: MSats
    status: ChatPaymentStatus
    recipient?: ChatMember
    updatedAt?: number
    memo?: string
    token?: string
    invoice?: Invoice
}

export enum ChatPaymentStatus {
    accepted,
    requested,
    canceled,
    rejected,
    paid,
}

export interface KeypairHex {
    publicKey: string
    privateKey: string
}

export interface ChatMember {
    /** Unique ID for the member (same as username for xmpp) */
    id: string
    username: string
    publicKeyHex?: String
}

export interface ChatGroupSettings {
    members: ChatMember[]
    // What can admins do that members can't (if anything)?
    // Enable payments? Show message history?
    // Consider instead a "creator: Member" field here
    admins: ChatMember[]
    paymentsEnabled: boolean
    // Consider instead a shareMessageHistory boolean
    // because each Member would request and store any Messages
    // from other Members upon joining a Group
    showMessageHistory: boolean
}

export interface ChatGroup extends Chat {
    description?: string
    settings?: ChatGroupSettings
    invitationCode?: string
}

export interface XmppCredentials {
    password: string
    keypairSeed: string
}
