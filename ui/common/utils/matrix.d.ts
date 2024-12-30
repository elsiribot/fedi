import { TFunction } from 'i18next';
import { z } from 'zod';
import { FormattedAmounts } from '../hooks/amount';
import { InputMedia, LoadedFederation, MSats, MatrixEvent, MatrixGroupPreview, MatrixPaymentEvent, MatrixPaymentStatus, MatrixRoom, MatrixRoomPowerLevels, MatrixTimelineItem, MatrixUser } from '../types';
export declare const matrixIdToUsername: (id: string | null | undefined) => string;
export declare const mxcUrlToHttpUrl: (mxcUrl: string, width: number, height: number, method?: "scale" | "crop") => string | undefined;
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
        file: z.ZodObject<{
            hashes: z.ZodObject<{
                sha256: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                sha256: string;
            }, {
                sha256: string;
            }>;
            url: z.ZodString;
            v: z.ZodLiteral<"v2">;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            hashes: z.ZodObject<{
                sha256: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                sha256: string;
            }, {
                sha256: string;
            }>;
            url: z.ZodString;
            v: z.ZodLiteral<"v2">;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            hashes: z.ZodObject<{
                sha256: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                sha256: string;
            }, {
                sha256: string;
            }>;
            url: z.ZodString;
            v: z.ZodLiteral<"v2">;
        }, z.ZodTypeAny, "passthrough">>;
    }, "strip", z.ZodTypeAny, {
        msgtype: "m.image";
        body: string;
        info: {
            mimetype: string;
            size: number;
            w: number;
            h: number;
        };
        file: {
            hashes: {
                sha256: string;
            };
            url: string;
            v: "v2";
        } & {
            [k: string]: unknown;
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
        file: {
            hashes: {
                sha256: string;
            };
            url: string;
            v: "v2";
        } & {
            [k: string]: unknown;
        };
    }>;
    'm.video': z.ZodObject<{
        msgtype: z.ZodLiteral<"m.video">;
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
        file: z.ZodObject<{
            hashes: z.ZodObject<{
                sha256: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                sha256: string;
            }, {
                sha256: string;
            }>;
            url: z.ZodString;
            v: z.ZodLiteral<"v2">;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            hashes: z.ZodObject<{
                sha256: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                sha256: string;
            }, {
                sha256: string;
            }>;
            url: z.ZodString;
            v: z.ZodLiteral<"v2">;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            hashes: z.ZodObject<{
                sha256: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                sha256: string;
            }, {
                sha256: string;
            }>;
            url: z.ZodString;
            v: z.ZodLiteral<"v2">;
        }, z.ZodTypeAny, "passthrough">>;
    }, "strip", z.ZodTypeAny, {
        msgtype: "m.video";
        body: string;
        info: {
            mimetype: string;
            size: number;
            w: number;
            h: number;
        };
        file: {
            hashes: {
                sha256: string;
            };
            url: string;
            v: "v2";
        } & {
            [k: string]: unknown;
        };
    }, {
        msgtype: "m.video";
        body: string;
        info: {
            mimetype: string;
            size: number;
            w: number;
            h: number;
        };
        file: {
            hashes: {
                sha256: string;
            };
            url: string;
            v: "v2";
        } & {
            [k: string]: unknown;
        };
    }>;
    'm.file': z.ZodObject<{
        msgtype: z.ZodLiteral<"m.file">;
        body: z.ZodString;
        info: z.ZodObject<{
            mimetype: z.ZodString;
            size: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            mimetype: string;
            size: number;
        }, {
            mimetype: string;
            size: number;
        }>;
        file: z.ZodObject<{
            hashes: z.ZodObject<{
                sha256: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                sha256: string;
            }, {
                sha256: string;
            }>;
            url: z.ZodString;
            v: z.ZodLiteral<"v2">;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            hashes: z.ZodObject<{
                sha256: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                sha256: string;
            }, {
                sha256: string;
            }>;
            url: z.ZodString;
            v: z.ZodLiteral<"v2">;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            hashes: z.ZodObject<{
                sha256: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                sha256: string;
            }, {
                sha256: string;
            }>;
            url: z.ZodString;
            v: z.ZodLiteral<"v2">;
        }, z.ZodTypeAny, "passthrough">>;
    }, "strip", z.ZodTypeAny, {
        msgtype: "m.file";
        body: string;
        info: {
            mimetype: string;
            size: number;
        };
        file: {
            hashes: {
                sha256: string;
            };
            url: string;
            v: "v2";
        } & {
            [k: string]: unknown;
        };
    }, {
        msgtype: "m.file";
        body: string;
        info: {
            mimetype: string;
            size: number;
        };
        file: {
            hashes: {
                sha256: string;
            };
            url: string;
            v: "v2";
        } & {
            [k: string]: unknown;
        };
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
        recipientId: z.ZodOptional<z.ZodString>;
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
        federationId: z.ZodOptional<z.ZodString>;
        bolt11: z.ZodOptional<z.ZodString>;
        inviteCode: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: MatrixPaymentStatus;
        amount: number;
        msgtype: "xyz.fedi.payment";
        body: string;
        paymentId: string;
        inviteCode?: string | undefined;
        recipientId?: string | undefined;
        senderId?: string | undefined;
        ecash?: string | undefined;
        federationId?: string | undefined;
        bolt11?: string | undefined;
    }, {
        status: MatrixPaymentStatus;
        amount: number;
        msgtype: "xyz.fedi.payment";
        body: string;
        paymentId: string;
        inviteCode?: string | undefined;
        recipientId?: string | undefined;
        senderId?: string | undefined;
        ecash?: string | undefined;
        federationId?: string | undefined;
        bolt11?: string | undefined;
    }>;
    'xyz.fedi.deleted': z.ZodObject<{
        msgtype: z.ZodLiteral<"xyz.fedi.deleted">;
        body: z.ZodString;
        redacts: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        msgtype: "xyz.fedi.deleted";
        body: string;
        redacts: string;
        reason?: string | undefined;
    }, {
        msgtype: "xyz.fedi.deleted";
        body: string;
        redacts: string;
        reason?: string | undefined;
    }>;
    'xyz.fedi.preview-media': z.ZodObject<{
        msgtype: z.ZodLiteral<"xyz.fedi.preview-media">;
        body: z.ZodString;
        info: z.ZodObject<{
            mimetype: z.ZodString;
            w: z.ZodNumber;
            h: z.ZodNumber;
            uri: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            mimetype: string;
            w: number;
            h: number;
            uri: string;
        }, {
            mimetype: string;
            w: number;
            h: number;
            uri: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        msgtype: "xyz.fedi.preview-media";
        body: string;
        info: {
            mimetype: string;
            w: number;
            h: number;
            uri: string;
        };
    }, {
        msgtype: "xyz.fedi.preview-media";
        body: string;
        info: {
            mimetype: string;
            w: number;
            h: number;
            uri: string;
        };
    }>;
};
type MatrixEventUnknownContent = {
    msgtype: 'm.unknown';
    body: string;
    originalContent: MatrixEventContent;
};
export type MatrixEventContentType<T extends keyof typeof contentSchemas> = z.infer<(typeof contentSchemas)[T]>;
export type MatrixEventContent = z.infer<(typeof contentSchemas)[keyof typeof contentSchemas]> | MatrixEventUnknownContent;
export declare function formatMatrixEventContent(content: MatrixEventContent): MatrixEventContent;
/**
 * Given a list of events, organize the events in a nested list of "grouped"
 * messages. The groups are organized as follows:
 * - The outer-most list is split into groups of messages sent within a similar time-frame.
 * - The middle list is messages sent back-to-back by the same user in that time frame.
 * - The inner-most lists are the list of messages by that user.
 */
export declare function makeMatrixEventGroups(events: MatrixEvent[], sortOrder: 'desc' | 'asc'): MatrixEvent[][][];
export declare function makeChatFromPreview(preview: MatrixGroupPreview): MatrixRoom;
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
/**
 * Gets a {SUFFIX_LENGTH} UUID for a user to protect against impersonation.
 * Generates ID via `sha256(displayName || id)`.
 *
 * It includes the display name so the suffix will change if the displayname changes.
 */
export declare function getUserSuffix(id: MatrixUser['id']): string;
export declare function isPaymentEvent(event: MatrixEvent): event is MatrixPaymentEvent;
export declare function getReceivablePaymentEvents(timeline: MatrixTimelineItem[], myId: string, myFederations: LoadedFederation[]): MatrixPaymentEvent[];
/**
 * @param deep set to true to encode as a deep link
 */
export declare function encodeFediMatrixUserUri(id: string, deep?: boolean): string;
/**
 * @param deep set to true to encode as a deep link
 */
export declare function encodeFediMatrixRoomUri(id: MatrixRoom['id'], deep?: boolean): string;
export declare function decodeFediMatrixRoomUri(uri: string): string;
export declare function decodeFediMatrixUserUri(uri: string): string;
/**
 * TODO Implement more sophisticated parsing
 *   (for example: try to rule out emails)
 * Our existing pattern will match some invalid matrixIds, as
 * matrixIds have some constrains on what is a valid "username"
 * and "homeserver" address. At some point, we might want to implement
 * a "more complete" pattern for matching matrix ids to avoid
 * false positives. And if we do, we should also implement stronger
 * test vectors.
 *
 * Ref: https://github.com/matrix-org/matrix-android-sdk/blob/develop/matrix-sdk-core/src/main/java/org/matrix/androidsdk/core/MXPatterns.java
 * const MATRIX_DOMAIN = new RegExp(/:[A-Z0-9.-]+(:[0-9]{2,5})?/i)
 * const MATRIX_USER_NAME = new RegExp(/@[A-Z0-9\x21-\x39\x3B-\x7F]+/i)
 * const FULL_MATRIX_USER_ID = new RegExp(
 *    MATRIX_USER_NAME.source + MATRIX_DOMAIN.source,
 * )
 * export function isValidMatrixFullUserId(id: string) {
 *     return FULL_MATRIX_USER_ID.test(id)
 * }
 */
export declare function isValidMatrixUserId(id: string): boolean;
export declare function isValidMatrixRoomId(id: string): boolean;
export declare function shouldShowUnreadIndicator(notificationCount: number | undefined, isMarkedUnread: boolean | undefined): boolean;
export declare function isDeletedEvent(event: MatrixEvent): event is MatrixEvent<MatrixEventContentType<'xyz.fedi.deleted'>>;
export declare function isTextEvent(event: MatrixEvent): event is MatrixEvent<MatrixEventContentType<'m.text'>>;
export declare function isImageEvent(event: MatrixEvent): event is MatrixEvent<MatrixEventContentType<'m.image'>>;
export declare function isPreviewMediaEvent(event: MatrixEvent): event is MatrixEvent<MatrixEventContentType<'xyz.fedi.preview-media'>>;
export declare function isFileEvent(event: MatrixEvent): event is MatrixEvent<MatrixEventContentType<'m.file'>>;
export declare function isVideoEvent(event: MatrixEvent): event is MatrixEvent<MatrixEventContentType<'m.video'>>;
/**
 * Checks to see if a chat video/image event's content matches the `media` argument
 */
export declare const doesEventContentMatchPreviewMedia: (media: InputMedia, content: MatrixEventContentType<"m.video" | "m.image">) => boolean;
export {};
