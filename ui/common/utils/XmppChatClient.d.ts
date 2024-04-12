/// <reference types="node" />
/// <reference types="xmpp__jid" />
/// <reference types="xmpp__connection" />
import { client as xmppClient, Client as XmppClient, Options as XmppOptions } from '@xmpp/client';
import type { Status as XmppStatus } from '@xmpp/connection';
import { JID } from '@xmpp/jid';
import EventEmitter from 'events';
import type { Element } from 'ltx';
import { ArchiveQueryFilters, ArchiveQueryPagination, ChatAffiliation, ChatGroup, ChatMember, ChatMessage, ChatRole, Key, Keypair } from '../types';
import { XmppMemberRole } from './XmlUtils';
/** @deprecated XMPP legacy code */
interface XmppChatClientEventMap {
    status: XmppStatus;
    online: JID;
    message: ChatMessage;
    memberSeen: ChatMember;
    group: ChatGroup;
    groupUpdate: ChatGroup['id'];
    groupRole: {
        groupId: string;
        role: ChatRole;
    };
    groupAffiliation: {
        groupId: string;
        affiliation: ChatAffiliation;
    };
    error: Error;
}
/**
 * XmppChatClient is a class that manages the xmpp connection and provides
 * convenient events and methods that are tailored to the Fedi chat use-case.
 */
export declare class XmppChatClient {
    emitter: EventEmitter;
    clients: Record<string, XmppClient | undefined>;
    xmpp: ReturnType<typeof xmppClient>;
    encryptionKeys: Keypair;
    /*** Public methods ***/
    start(options: XmppOptions, encryptionKeys: Keypair): Promise<void | JID>;
    stop(): Promise<void>;
    fetchGroupMembersList(groupId: string, role: XmppMemberRole): Promise<ChatMember[]>;
    /**
     * This sends a request that causes a bunch of `message` events to trigger,
     * doesn't actually return message history.
     */
    fetchMessageHistory(filters: ArchiveQueryFilters | null, pagination: ArchiveQueryPagination | null): Promise<string | null>;
    /**
     * This sends a request that causes a bunch of `memberSeen` events to
     * trigger, doesn't actually return all members.
     */
    fetchMembers(): Promise<ChatMember[]>;
    fetchMemberPublicKey(memberId: string): Promise<string>;
    publishPublicKey(pubkey: Key): Promise<void>;
    publishNotificationToken(token: string): Promise<void>;
    addAdminToGroup(groupId: string, member: ChatMember): Promise<ChatMember>;
    generateUniqueGroupId(): Promise<string>;
    enterGroup(groupId: string): Promise<Element[]>;
    configureGroup(groupId: string, updatedName: string, broadcastOnly?: boolean): Promise<void>;
    joinGroup(groupId: string): Promise<ChatGroup>;
    createGroup(groupId: string, groupName: string, broadcastOnly?: boolean): Promise<ChatGroup>;
    leaveGroup(groupId: string): Promise<void>;
    fetchGroupConfig(groupId: string): Promise<Pick<ChatGroup, 'name' | 'broadcastOnly'>>;
    removeAdminFromGroup(groupId: string, member: ChatMember): Promise<ChatMember>;
    sendDirectMessage(recipientId: string, recipientPubkey: string, message: ChatMessage, senderKeys: Keypair, updatePayment: boolean, sendPushNotification?: boolean): Promise<void>;
    sendGroupMessage(group: Partial<ChatGroup>, message: ChatMessage): Promise<void>;
    emit<TEventName extends keyof XmppChatClientEventMap>(eventName: TEventName, argument: XmppChatClientEventMap[TEventName]): void;
    on<TEventName extends keyof XmppChatClientEventMap>(eventName: TEventName, handler: (argument: XmppChatClientEventMap[TEventName]) => void): void;
    off<TEventName extends keyof XmppChatClientEventMap>(eventName: TEventName, handler: (argument: XmppChatClientEventMap[TEventName]) => void): void;
    removeAllListeners(event?: keyof XmppChatClientEventMap): void;
    /*** Private methods ***/
    private handleStatus;
    private handleOnline;
    private handleElement;
    private handleStanza;
    private handleIncomingGroupMessage;
    private handleIncomingDirectMessage;
    private handleSubscriptionEvent;
    private handleIncomingMessageHistory;
    private handleIncomingRoster;
    private handleIncomingPresence;
    private handleError;
    private getQueryProperties;
    private decryptAndParseIncomingMessage;
    private formatIncomingMessage;
    private formatOutgoingMessage;
    private formatOutgoingGroupMessage;
    private memberFromJid;
}
/**
 * A simple manager of chat clients to allow for multi-federation chat handling.
 */
export declare class XmppChatClientManager {
    clients: Record<string, XmppChatClient | undefined>;
    getClient(federationId: string): XmppChatClient;
    destroyClient(federationId: string): Promise<void>;
}
export {};
