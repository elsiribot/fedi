import { XmppConnectionOptions } from '../types';
/**
 * Creates an ephemeral XMPP client used solely for registration
 * opens the stream and terminates on success or failure.
 * @deprecated XMPP legacy code
 */
export declare const registerXmppUser: (username: string, password: string, xmppOptions: XmppConnectionOptions) => Promise<boolean>;
/**
 * Creates an ephemeral XMPP client used solely for authentication check
 * opens the stream and terminates on success or failure.
 * @deprecated XMPP legacy code
 */
export declare const checkXmppUser: (username: string, password: string, xmppOptions: XmppConnectionOptions) => Promise<boolean>;
/** @deprecated XMPP legacy code */
export declare function encodeGroupInvitationLink(groupId: string): string;
/** @deprecated XMPP legacy code */
export declare function decodeGroupInvitationLink(link: string): string;
/** @deprecated XMPP legacy code */
export declare function encodeDirectChatLink(memberId: string): string;
/** @deprecated XMPP legacy code */
export declare function decodeDirectChatLink(link: string): string;
