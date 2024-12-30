import { TFunction } from 'i18next';
import { z } from 'zod';
import { ChatMessage, ChatType } from '@fedi/common/types';
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
