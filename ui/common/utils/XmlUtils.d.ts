import { Element } from 'ltx';
import { Key, Keypair } from '@fedi/common/types';
import { ArchiveQueryFilters, ArchiveQueryPagination } from '../types';
interface CommonXmppAttributes {
    from?: string;
    to?: string;
}
/** @deprecated XMPP legacy code */
export declare enum XmppMemberAffiliation {
    none = "none",
    member = "member",
    owner = "owner"
}
/** @deprecated XMPP legacy code */
export declare enum XmppMemberRole {
    visitor = "visitor",
    participant = "participant",
    moderator = "moderator"
}
type XmppArgs = AddToRosterArgs | GetMessagesArgs | GetRoomConfigArgs | SetRoomConfigArgs | GetRosterArgs | EnterMucRoomArgs | GroupChatArgs | GetPublicKeyArgs | SetPubsubNodeConfigArgs | PublishPublicKeyArgs;
declare class XmppStanza {
    tag: string;
    name: string;
    args?: XmppArgs;
    build: () => Element;
}
declare class XmppMessage extends XmppStanza {
    tag: string;
}
declare class XmppPresence extends XmppStanza {
    tag: string;
}
/** @deprecated XMPP legacy code */
export declare class XmppQuery extends XmppStanza {
    tag: string;
}
interface Message {
    id?: string;
    content: string;
}
interface EncryptedDirectChatArgs extends CommonXmppAttributes {
    message: Message;
    senderKeys: Keypair;
    recipientPublicKey: Key;
    updatePayment?: boolean;
    sendPushNotification?: boolean;
}
interface GroupChatArgs extends CommonXmppAttributes {
    message: Message;
}
export declare class EncryptedDirectChatMessage extends XmppMessage {
    static id: string;
    args: EncryptedDirectChatArgs;
    constructor(args: EncryptedDirectChatArgs);
    build: () => Element;
}
/** @deprecated XMPP legacy code */
export declare class GroupChatMessage extends XmppMessage {
    static id: string;
    args: GroupChatArgs;
    constructor(args: GroupChatArgs);
    build: () => Element;
}
export interface EnterMucRoomArgs extends CommonXmppAttributes {
    toGroup: string;
}
export declare class EnterMucRoomPresence extends XmppPresence {
    static id: string;
    args: EnterMucRoomArgs;
    constructor(args: EnterMucRoomArgs);
    build: () => Element;
}
export interface LeaveMucRoomArgs extends CommonXmppAttributes {
    toGroup: string;
}
/** @deprecated XMPP legacy code */
export declare class LeaveMucRoomPresence extends XmppPresence {
    static id: string;
    args: LeaveMucRoomArgs;
    constructor(args: LeaveMucRoomArgs);
    build: () => Element;
}
interface AddToRosterArgs extends CommonXmppAttributes {
    newRosterItem: string;
}
interface GetMembersListArgs extends CommonXmppAttributes {
    role: XmppMemberRole;
}
type GetMessagesArgs = {
    filters?: ArchiveQueryFilters | null;
    pagination?: ArchiveQueryPagination | null;
};
type GetRoomConfigArgs = CommonXmppAttributes;
type GetRosterArgs = CommonXmppAttributes;
type GetPublicKeyArgs = CommonXmppAttributes;
interface PublishNotificationTokenArgs extends CommonXmppAttributes {
    token: string;
}
interface PublishPublicKeyArgs extends CommonXmppAttributes {
    pubkey: string;
}
interface SetMemberAffiliationArgs extends CommonXmppAttributes {
    memberJid: string;
    affiliation: string;
}
type SetPubsubNodeConfigArgs = CommonXmppAttributes;
interface SetRoomConfigArgs extends CommonXmppAttributes {
    roomName: string;
    moderatedRoom?: boolean;
}
type UniqueRoomNameArgs = CommonXmppAttributes;
/** @deprecated XMPP legacy code */
export declare class AddToRosterQuery extends XmppQuery {
    static id: string;
    args: AddToRosterArgs;
    constructor(args: AddToRosterArgs);
    build: () => Element;
}
/** @deprecated XMPP legacy code */
export declare class GetMembersListQuery extends XmppQuery {
    static id: string;
    args: GetMembersListArgs;
    constructor(args: GetMembersListArgs);
    build: () => Element;
}
/** @deprecated XMPP legacy code */
export declare class GetMessagesQuery extends XmppQuery {
    static id: string;
    args: GetMessagesArgs;
    constructor(args: GetMessagesArgs);
    build: () => Element;
}
/** @deprecated XMPP legacy code */
export declare class GetRoomConfigQuery extends XmppQuery {
    static id: string;
    args: GetRoomConfigArgs;
    constructor(args: GetRoomConfigArgs);
    build: () => Element;
}
/** @deprecated XMPP legacy code */
export declare class GetRosterQuery extends XmppQuery {
    static id: string;
    args: GetRosterArgs;
    constructor(args: GetRosterArgs);
    build: () => Element;
}
/** @deprecated XMPP legacy code */
export declare class GetPublicKeyQuery extends XmppQuery {
    static id: string;
    args: GetPublicKeyArgs;
    constructor(args: GetPublicKeyArgs);
    build: () => Element;
}
export declare class PublishPublicKeyQuery extends XmppQuery {
    static id: string;
    args: PublishPublicKeyArgs;
    constructor(args: PublishPublicKeyArgs);
    build: () => Element;
}
export declare class PublishNotificationTokenQuery extends XmppQuery {
    static id: string;
    args: PublishNotificationTokenArgs;
    constructor(args: PublishNotificationTokenArgs);
    build: () => Element;
}
export declare class SetMemberAffiliationQuery extends XmppQuery {
    static id: string;
    args: SetMemberAffiliationArgs;
    constructor(args: SetMemberAffiliationArgs);
    build: () => Element;
}
export declare class SetPubsubNodeConfigQuery extends XmppQuery {
    static id: string;
    args: SetPubsubNodeConfigArgs;
    constructor(args: SetPubsubNodeConfigArgs);
    build: () => Element;
}
export declare class SetRoomConfigQuery extends XmppQuery {
    static id: string;
    args: SetRoomConfigArgs;
    constructor(args: SetRoomConfigArgs);
    build: () => Element;
}
export declare class UniqueRoomNameQuery extends XmppQuery {
    static id: string;
    args: UniqueRoomNameArgs;
    constructor(args: UniqueRoomNameArgs);
    build: () => Element;
}
declare class XmlUtils {
    buildPresence(presence: XmppPresence): Element;
    buildQuery(query: XmppQuery): Element;
    buildMessage(message: XmppMessage): Element;
}
declare const xmlUtils: XmlUtils;
export default xmlUtils;
