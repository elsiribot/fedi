import { TFunction } from 'i18next';
import { z } from 'zod';
import { FormattedAmounts } from '../hooks/amount';
import { MSats, MatrixEvent, MatrixPaymentEvent, MatrixPaymentStatus, MatrixRoomMember, MatrixRoomPowerLevels, MatrixTimelineItem, MatrixUser } from '../types';
export declare const matrixIdToUsername: (id: string | null | undefined) => string;
export declare const mxcUrlToHttpUrl: (mxcUrl: string, width: number, height: number, method?: 'scale' | 'crop') => string | undefined;
declare const contentSchemas: {
    'm.text': z.ZodObject<{
        msgtype: z.ZodLiteral<"m.text">;
        body: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        msgtype: "m.text";
        body: string;
    }, {
        msgtype: "m.text";
        body: string;
    }>;
    'm.notice': z.ZodObject<{
        msgtype: z.ZodLiteral<"m.notice">;
        body: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        msgtype: "m.notice";
        body: string;
    }, {
        msgtype: "m.notice";
        body: string;
    }>;
    'm.image': z.ZodObject<{
        msgtype: z.ZodLiteral<"m.image">;
        body: z.ZodString;
        info: z.ZodObject<{
            mimetype: z.ZodString;
            size: z.ZodNumber;
            w: z.ZodNumber;
            h: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            mimetype: string;
            size: number;
            w: number;
            h: number;
        }, {
            mimetype: string;
            size: number;
            w: number;
            h: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        msgtype: "m.image";
        body: string;
        info: {
            mimetype: string;
            size: number;
            w: number;
            h: number;
        };
    }, {
        msgtype: "m.image";
        body: string;
        info: {
            mimetype: string;
            size: number;
            w: number;
            h: number;
        };
    }>;
    'm.video': z.ZodObject<{
        msgtype: z.ZodLiteral<"m.video">;
        body: z.ZodString;
        url: z.ZodString;
        info: z.ZodObject<{
            mimetype: z.ZodString;
            size: z.ZodNumber;
            w: z.ZodNumber;
            h: z.ZodNumber;
            duration: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            mimetype: string;
            size: number;
            w: number;
            h: number;
            duration: number;
        }, {
            mimetype: string;
            size: number;
            w: number;
            h: number;
            duration: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        msgtype: "m.video";
        body: string;
        info: {
            mimetype: string;
            size: number;
            w: number;
            h: number;
            duration: number;
        };
        url: string;
    }, {
        msgtype: "m.video";
        body: string;
        info: {
            mimetype: string;
            size: number;
            w: number;
            h: number;
            duration: number;
        };
        url: string;
    }>;
    'm.emote': z.ZodObject<{
        msgtype: z.ZodLiteral<"m.emote">;
        body: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        msgtype: "m.emote";
        body: string;
    }, {
        msgtype: "m.emote";
        body: string;
    }>;
    /**
     * Fedi custom events
     *
     * WARNING: Any non-backwards compatible changes to these will cause old
     * messages to not render properly anymore. They will fail validation, and
     * be sent to the frontend as "m.unknown" with only the body intact. New
     * fields should either be `.optional()`, or consider making a new type.
     */
    'xyz.fedi.payment': z.ZodObject<{
        msgtype: z.ZodLiteral<"xyz.fedi.payment">;
        body: z.ZodString;
        status: z.ZodNativeEnum<typeof MatrixPaymentStatus>;
        /**
         * Client-side generated unique identifier for the payment, used across
         * multiple events to indicate updates to the same payment.
         */
        paymentId: z.ZodString;
        /**
         * The matrix id of the user who will receive this payment.
         */
        recipientId: z.ZodString;
        /**
         * The amount of the payment, either requested or sent.
         */
        amount: z.ZodNumber;
        /**
         * The matrix id of the user who sent the payment.
         *
         * TODO: Validation that this exists for certain MatrixPaymentStatus.
         */
        senderId: z.ZodOptional<z.ZodString>;
        /**
         * The ecash token attached to the payment.
         *
         * TODO: Validation that this exists for certain MatrixPaymentStatus.
         * TODO: Encrypt this using some information from the intended recipient,
         * to enable payments in group chats.
         */
        ecash: z.ZodOptional<z.ZodString>;
        /**
         * The federation this payment was made in, or is expected to be received in.
         *
         * TODO: Potentially make this optional, allow anyone to pay to using any
         * federation they have in common, or via bolt11 (see more below.)
         */
        federationId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        senderId?: string | undefined;
        ecash?: string | undefined;
        amount: number;
        msgtype: "xyz.fedi.payment";
        status: MatrixPaymentStatus;
        body: string;
        paymentId: string;
        recipientId: string;
        federationId: string;
    }, {
        senderId?: string | undefined;
        ecash?: string | undefined;
        amount: number;
        msgtype: "xyz.fedi.payment";
        status: MatrixPaymentStatus;
        body: string;
        paymentId: string;
        recipientId: string;
        federationId: string;
    }>;
};
interface MatrixEventUnknownContent {
    msgtype: 'm.unknown';
    body: string;
    originalContent: unknown;
}
export type MatrixEventContent = z.infer<(typeof contentSchemas)[keyof typeof contentSchemas]> | MatrixEventUnknownContent;
export declare function formatMatrixEventContent(content: unknown): MatrixEventContent;
/**
 * Given a list of events, organize the events in a nested list of "grouped"
 * messages. The groups are organized as follows:
 * - The outer-most list is split into groups of messages sent within a similar time-frame.
 * - The middle list is messages sent back-to-back by the same user in that time frame.
 * - The inner-most lists are the list of messages by that user.
 */
export declare function makeMatrixEventGroups(events: MatrixEvent[], sortOrder: 'desc' | 'asc'): MatrixEvent[][][];
export declare function getRoomEventPowerLevel(powerLevels: MatrixRoomPowerLevels, events: string | string[]): number;
export declare const makeMatrixPaymentText: ({ t, event, myId, eventSender, paymentSender, paymentRecipient, makeFormattedAmountsFromMSats, }: {
    t: TFunction;
    event: MatrixPaymentEvent;
    myId: string;
    eventSender: MatrixUser | null | undefined;
    paymentSender: MatrixUser | null | undefined;
    paymentRecipient: MatrixUser | null | undefined;
    makeFormattedAmountsFromMSats: (amt: MSats) => FormattedAmounts;
}) => string;
export declare function isPaymentEvent(event: MatrixEvent): event is MatrixPaymentEvent;
export declare function getReceivablePaymentEvents(timeline: MatrixTimelineItem[], myId: string): MatrixPaymentEvent[];
export declare function encodeFediMatrixUserUri(id: string): string;
export declare function decodeFediMatrixUserUri(uri: string): string;
export declare function isValidMatrixUserId(id: string): boolean;
/**
 * Make the first member the current user.
 * Leave the rest of the list as is.
 *
 * @param {string} userId userId of current user
 * @param {MatrixRoomMember[]} members list of room members
 * @returns {MatrixRoomMember[]}
 */
export declare function sortMembersByMe(userId: string, members: MatrixRoomMember[]): MatrixRoomMember[];
export {};
