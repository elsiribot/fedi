import type { JID } from '@xmpp/jid';
import { TFunction } from 'i18next';
import { z } from 'zod';
import { ChatMember, ChatMessage, ChatType, MSats } from '@fedi/common/types';
import { FormattedAmounts } from '../hooks/amount';
/** @deprecated XMPP legacy code */
export declare const makePaymentText: (t: TFunction, message: ChatMessage, authenticatedMember: ChatMember | null, makeFormattedAmountsFromMSats: (amt: MSats) => FormattedAmounts) => string;
export declare const jidToId: (jid: JID | string) => string;
/**
 * @deprecated XMPP legacy code
 *
 * Given a list of messages, organize the messages in a nested list of "grouped"
 * messages. The groups are organized as follows:
 * - The outer-most list is split into groups of messages sent within a similar time-frame.
 * - The middle list is messages sent back-to-back by the same user in that time frame.
 * - The inner-most lists are the list of messages by that user.
 */
export declare const makeMessageGroups: <T extends ChatMessage>(messages: T[], sortOrder: 'desc' | 'asc') => T[][][];
/**
 * Given a message, return its chat ID and the type of chat (direct or group).
 */
export declare const getChatInfoFromMessage: <T extends ChatMessage>(message: T, myId: string) => {
    id: string;
    type: ChatType;
};
/**
 * Given a list of messages, return the latest in the list.
 */
export declare const getLatestMessage: <T extends ChatMessage>(messages: T[]) => T | null;
/**
 * Given a list of messages, return the one with the latest payment update
 */
export declare const getLatestPaymentUpdate: <T extends ChatMessage>(messages: T[]) => T | null;
/**
 * Given a list of messages, return a map keyed by the chat ID and with a value
 * of the latest message ID in that chat.
 */
export declare const getLatestMessageIdsForChats: (messages: ChatMessage[], myId: string) => Record<string, string | undefined>;
/**
 * Given a list of messages, return a map keyed by the chat ID and with a value
 * of the latest payment update message ID in that chat.
 */
export declare const getLatestPaymentUpdateIdsForChats: (messages: ChatMessage[], myId: string) => Record<string, string | undefined>;
/**
 * Returns a timestamp for when an existing payment is updated at.
 * Ensures the timestamp is always greater, in case of clocks being out of sync.
 */
export declare const makePaymentUpdatedAt: (payment: {
    updatedAt?: number;
} | undefined) => number;
/**
 * Validates a user-entered displayName against the following criteria:
 *  - length <= 21
 *  - must be lowercase
 *  - must not include any banned term
 */
export declare const getDisplayNameValidator: () => z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, string, string>;
export type DisplayNameValidatorType = ReturnType<typeof getDisplayNameValidator>;
type ParsedResult = {
    success: true;
    data: string;
} | {
    success: false;
    errorMessage: string;
};
export declare const parseData: <T extends z.ZodTypeAny>(data: unknown, schema: T, t: TFunction) => ParsedResult;
export {};
