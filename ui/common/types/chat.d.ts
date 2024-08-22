/// <reference types="xmpp__connection" />
import type { Status } from '@xmpp/connection';
import { RpcResponse } from './bindings';
import type { Invoice } from './fedimint';
import type { MSats } from './units';
export declare enum ChatType {
    direct = "direct",
    group = "group"
}
export declare enum ChatAffiliation {
    none = "none",
    member = "member",
    owner = "owner"
}
export declare enum ChatRole {
    visitor = "visitor",
    participant = "participant",
    moderator = "moderator"
}
export interface Chat {
    /** Unique ID for the chat, random value for groups and user id for DMs */
    id: string;
    name: string;
    members: string[];
    type: ChatType;
    broadcastOnly: boolean;
}
export interface ChatWithLatestMessage extends Chat {
    latestMessage?: ChatMessage;
    hasNewMessages: boolean;
    latestPaymentUpdate?: ChatMessage;
}
export declare enum ChatMessageStatus {
    sent = 0,
    failed = 1,
    queued = 2
}
export interface ChatMessage {
    id: string;
    content: string;
    sentAt: number;
    sentBy: ChatMember['id'];
    /** Only present on group messages */
    sentIn?: ChatGroup['id'];
    /** Only present on direct messages */
    sentTo?: ChatMember['id'];
    /** Only present on chat payment messages */
    payment?: ChatPayment;
    /** Only present locally on messages sent from us */
    status?: ChatMessageStatus;
}
export interface ChatPayment {
    amount: MSats;
    status: ChatPaymentStatus;
    recipient?: string;
    updatedAt?: number;
    memo?: string;
    token?: string | null;
    invoice?: Invoice;
}
export declare enum ChatPaymentStatus {
    accepted = 0,
    requested = 1,
    canceled = 2,
    rejected = 3,
    paid = 4
}
export interface Key {
    hex: string;
}
export interface Keypair {
    publicKey: Key;
    privateKey: Key;
}
export interface ChatMember {
    /** Unique ID for the member (same as username for xmpp) */
    id: string;
    username: string;
    publicKeyHex?: string;
}
export interface ChatGroup {
    id: string;
    name: string;
    joinedAt: number;
    broadcastOnly?: boolean;
}
/** @deprecated XMPP legacy code */
export interface XmppChatMember extends ChatMember {
    jid: string;
}
export interface ChatGroupSettings {
    members: ChatMember[];
    admins: ChatMember[];
    paymentsEnabled: boolean;
    showMessageHistory: boolean;
}
/** @deprecated XMPP legacy code */
export type XmppClientStatus = Status;
/** @deprecated XMPP legacy code */
export type XmppCredentials = RpcResponse<'xmppCredentials'>;
/** @deprecated XMPP legacy code */
export interface XmppConnectionOptions {
    domain?: string;
    mucDomain?: string;
    resource?: string;
    service?: string;
}
export type ArchiveQueryFilters = {
    withJid?: string | null;
};
export type ArchiveQueryPagination = {
    limit?: string | null;
    after?: string | null;
};
export type MessageArchiveQuery = {
    filters?: ArchiveQueryFilters | null;
    pagination?: ArchiveQueryPagination | null;
};
