/// <reference types="xmpp__connection" />
import { PayloadAction, AnyAction } from '@reduxjs/toolkit';
import { CommonState } from '.';
import { ChatMessage, ChatMember, ChatGroup, ChatPayment, Keypair, XmppCredentials, XmppClientStatus, ChatWithLatestMessage, Federation, ChatRole, ChatAffiliation } from '../types';
import { XmppMemberRole } from '../utils/XmlUtils';
import { XmppChatClient } from '../utils/XmppChatClient';
import { FedimintBridge } from '../utils/fedimint';
type FederationPayloadAction<T = object> = PayloadAction<{
    federationId: string;
} & T>;
/*** Initial State ***/
/** @deprecated XMPP legacy code */
declare const initialFederationChatState: {
    clientStatus: keyof import("@xmpp/connection").StatusEvents;
    clientLastOnlineAt: number;
    clientError: string | null;
    authenticatedMember: ChatMember | null;
    credentials: {
        password: string;
        keypairSeed: string;
        username: string | null;
    } | null;
    messages: ChatMessage[];
    groups: ChatGroup[];
    groupRoles: Record<string, string | undefined>;
    groupAffiliations: Record<string, string | undefined>;
    membersSeen: ChatMember[];
    lastFetchedMessageId: string | null;
    lastReadMessageTimestamps: Record<string, number | undefined>;
    lastSeenMessageTimestamp: number | null;
    encryptionKeys: Keypair | null;
    pushNotificationToken: string | null;
    websocketIsHealthy: boolean;
};
/** @deprecated XMPP legacy code */
type FederationChatState = typeof initialFederationChatState;
declare const initialState: Record<string, {
    clientStatus: keyof import("@xmpp/connection").StatusEvents;
    clientLastOnlineAt: number;
    clientError: string | null;
    authenticatedMember: ChatMember | null;
    credentials: {
        password: string;
        keypairSeed: string;
        username: string | null;
    } | null;
    messages: ChatMessage[];
    groups: ChatGroup[];
    groupRoles: Record<string, string | undefined>;
    groupAffiliations: Record<string, string | undefined>;
    membersSeen: ChatMember[];
    lastFetchedMessageId: string | null;
    lastReadMessageTimestamps: Record<string, number | undefined>;
    lastSeenMessageTimestamp: number | null;
    encryptionKeys: Keypair | null;
    pushNotificationToken: string | null;
    websocketIsHealthy: boolean;
} | undefined>;
/** @deprecated XMPP legacy code */
export type ChatState = typeof initialState;
/** @deprecated XMPP legacy code */
export declare const chatSlice: import("@reduxjs/toolkit").Slice<Record<string, {
    clientStatus: keyof import("@xmpp/connection").StatusEvents;
    clientLastOnlineAt: number;
    clientError: string | null;
    authenticatedMember: ChatMember | null;
    credentials: {
        password: string;
        keypairSeed: string;
        username: string | null;
    } | null;
    messages: ChatMessage[];
    groups: ChatGroup[];
    groupRoles: Record<string, string | undefined>;
    groupAffiliations: Record<string, string | undefined>;
    membersSeen: ChatMember[];
    lastFetchedMessageId: string | null;
    lastReadMessageTimestamps: Record<string, number | undefined>;
    lastSeenMessageTimestamp: number | null;
    encryptionKeys: Keypair | null;
    pushNotificationToken: string | null;
    websocketIsHealthy: boolean;
} | undefined>, {
    setChatClientStatus(state: import("immer/dist/internal").WritableDraft<Record<string, {
        clientStatus: keyof import("@xmpp/connection").StatusEvents;
        clientLastOnlineAt: number;
        clientError: string | null;
        authenticatedMember: ChatMember | null;
        credentials: {
            password: string;
            keypairSeed: string;
            username: string | null;
        } | null;
        messages: ChatMessage[];
        groups: ChatGroup[];
        groupRoles: Record<string, string | undefined>;
        groupAffiliations: Record<string, string | undefined>;
        membersSeen: ChatMember[];
        lastFetchedMessageId: string | null;
        lastReadMessageTimestamps: Record<string, number | undefined>;
        lastSeenMessageTimestamp: number | null;
        encryptionKeys: Keypair | null;
        pushNotificationToken: string | null;
        websocketIsHealthy: boolean;
    } | undefined>>, action: {
        payload: {
            federationId: string;
        } & {
            status: XmppClientStatus;
        };
        type: string;
    }): void;
    setChatClientError(state: import("immer/dist/internal").WritableDraft<Record<string, {
        clientStatus: keyof import("@xmpp/connection").StatusEvents;
        clientLastOnlineAt: number;
        clientError: string | null;
        authenticatedMember: ChatMember | null;
        credentials: {
            password: string;
            keypairSeed: string;
            username: string | null;
        } | null;
        messages: ChatMessage[];
        groups: ChatGroup[];
        groupRoles: Record<string, string | undefined>;
        groupAffiliations: Record<string, string | undefined>;
        membersSeen: ChatMember[];
        lastFetchedMessageId: string | null;
        lastReadMessageTimestamps: Record<string, number | undefined>;
        lastSeenMessageTimestamp: number | null;
        encryptionKeys: Keypair | null;
        pushNotificationToken: string | null;
        websocketIsHealthy: boolean;
    } | undefined>>, action: {
        payload: {
            federationId: string;
        } & {
            error: string;
        };
        type: string;
    }): void;
    setChatMembersSeen(state: import("immer/dist/internal").WritableDraft<Record<string, {
        clientStatus: keyof import("@xmpp/connection").StatusEvents;
        clientLastOnlineAt: number;
        clientError: string | null;
        authenticatedMember: ChatMember | null;
        credentials: {
            password: string;
            keypairSeed: string;
            username: string | null;
        } | null;
        messages: ChatMessage[];
        groups: ChatGroup[];
        groupRoles: Record<string, string | undefined>;
        groupAffiliations: Record<string, string | undefined>;
        membersSeen: ChatMember[];
        lastFetchedMessageId: string | null;
        lastReadMessageTimestamps: Record<string, number | undefined>;
        lastSeenMessageTimestamp: number | null;
        encryptionKeys: Keypair | null;
        pushNotificationToken: string | null;
        websocketIsHealthy: boolean;
    } | undefined>>, action: {
        payload: {
            federationId: string;
        } & {
            membersSeen: ChatMember[];
        };
        type: string;
    }): void;
    addChatMemberSeen(state: import("immer/dist/internal").WritableDraft<Record<string, {
        clientStatus: keyof import("@xmpp/connection").StatusEvents;
        clientLastOnlineAt: number;
        clientError: string | null;
        authenticatedMember: ChatMember | null;
        credentials: {
            password: string;
            keypairSeed: string;
            username: string | null;
        } | null;
        messages: ChatMessage[];
        groups: ChatGroup[];
        groupRoles: Record<string, string | undefined>;
        groupAffiliations: Record<string, string | undefined>;
        membersSeen: ChatMember[];
        lastFetchedMessageId: string | null;
        lastReadMessageTimestamps: Record<string, number | undefined>;
        lastSeenMessageTimestamp: number | null;
        encryptionKeys: Keypair | null;
        pushNotificationToken: string | null;
        websocketIsHealthy: boolean;
    } | undefined>>, action: {
        payload: {
            federationId: string;
        } & {
            member: ChatMember;
        };
        type: string;
    }): Record<string, {
        clientStatus: keyof import("@xmpp/connection").StatusEvents;
        clientLastOnlineAt: number;
        clientError: string | null;
        authenticatedMember: ChatMember | null;
        credentials: {
            password: string;
            keypairSeed: string;
            username: string | null;
        } | null;
        messages: ChatMessage[];
        groups: ChatGroup[];
        groupRoles: Record<string, string | undefined>;
        groupAffiliations: Record<string, string | undefined>;
        membersSeen: ChatMember[];
        lastFetchedMessageId: string | null;
        lastReadMessageTimestamps: Record<string, number | undefined>;
        lastSeenMessageTimestamp: number | null;
        encryptionKeys: Keypair | null;
        pushNotificationToken: string | null;
        websocketIsHealthy: boolean;
    } | undefined>;
    setChatMessages(state: import("immer/dist/internal").WritableDraft<Record<string, {
        clientStatus: keyof import("@xmpp/connection").StatusEvents;
        clientLastOnlineAt: number;
        clientError: string | null;
        authenticatedMember: ChatMember | null;
        credentials: {
            password: string;
            keypairSeed: string;
            username: string | null;
        } | null;
        messages: ChatMessage[];
        groups: ChatGroup[];
        groupRoles: Record<string, string | undefined>;
        groupAffiliations: Record<string, string | undefined>;
        membersSeen: ChatMember[];
        lastFetchedMessageId: string | null;
        lastReadMessageTimestamps: Record<string, number | undefined>;
        lastSeenMessageTimestamp: number | null;
        encryptionKeys: Keypair | null;
        pushNotificationToken: string | null;
        websocketIsHealthy: boolean;
    } | undefined>>, action: {
        payload: {
            federationId: string;
        } & {
            messages: ChatMessage[];
        };
        type: string;
    }): void;
    addChatMessage(state: import("immer/dist/internal").WritableDraft<Record<string, {
        clientStatus: keyof import("@xmpp/connection").StatusEvents;
        clientLastOnlineAt: number;
        clientError: string | null;
        authenticatedMember: ChatMember | null;
        credentials: {
            password: string;
            keypairSeed: string;
            username: string | null;
        } | null;
        messages: ChatMessage[];
        groups: ChatGroup[];
        groupRoles: Record<string, string | undefined>;
        groupAffiliations: Record<string, string | undefined>;
        membersSeen: ChatMember[];
        lastFetchedMessageId: string | null;
        lastReadMessageTimestamps: Record<string, number | undefined>;
        lastSeenMessageTimestamp: number | null;
        encryptionKeys: Keypair | null;
        pushNotificationToken: string | null;
        websocketIsHealthy: boolean;
    } | undefined>>, action: {
        payload: {
            federationId: string;
        } & {
            message: ChatMessage;
        };
        type: string;
    }): Record<string, {
        clientStatus: keyof import("@xmpp/connection").StatusEvents;
        clientLastOnlineAt: number;
        clientError: string | null;
        authenticatedMember: ChatMember | null;
        credentials: {
            password: string;
            keypairSeed: string;
            username: string | null;
        } | null;
        messages: ChatMessage[];
        groups: ChatGroup[];
        groupRoles: Record<string, string | undefined>;
        groupAffiliations: Record<string, string | undefined>;
        membersSeen: ChatMember[];
        lastFetchedMessageId: string | null;
        lastReadMessageTimestamps: Record<string, number | undefined>;
        lastSeenMessageTimestamp: number | null;
        encryptionKeys: Keypair | null;
        pushNotificationToken: string | null;
        websocketIsHealthy: boolean;
    } | undefined>;
    setChatGroups(state: import("immer/dist/internal").WritableDraft<Record<string, {
        clientStatus: keyof import("@xmpp/connection").StatusEvents;
        clientLastOnlineAt: number;
        clientError: string | null;
        authenticatedMember: ChatMember | null;
        credentials: {
            password: string;
            keypairSeed: string;
            username: string | null;
        } | null;
        messages: ChatMessage[];
        groups: ChatGroup[];
        groupRoles: Record<string, string | undefined>;
        groupAffiliations: Record<string, string | undefined>;
        membersSeen: ChatMember[];
        lastFetchedMessageId: string | null;
        lastReadMessageTimestamps: Record<string, number | undefined>;
        lastSeenMessageTimestamp: number | null;
        encryptionKeys: Keypair | null;
        pushNotificationToken: string | null;
        websocketIsHealthy: boolean;
    } | undefined>>, action: {
        payload: {
            federationId: string;
        } & {
            groups: ChatGroup[];
        };
        type: string;
    }): void;
    setChatGroupRole(state: import("immer/dist/internal").WritableDraft<Record<string, {
        clientStatus: keyof import("@xmpp/connection").StatusEvents;
        clientLastOnlineAt: number;
        clientError: string | null;
        authenticatedMember: ChatMember | null;
        credentials: {
            password: string;
            keypairSeed: string;
            username: string | null;
        } | null;
        messages: ChatMessage[];
        groups: ChatGroup[];
        groupRoles: Record<string, string | undefined>;
        groupAffiliations: Record<string, string | undefined>;
        membersSeen: ChatMember[];
        lastFetchedMessageId: string | null;
        lastReadMessageTimestamps: Record<string, number | undefined>;
        lastSeenMessageTimestamp: number | null;
        encryptionKeys: Keypair | null;
        pushNotificationToken: string | null;
        websocketIsHealthy: boolean;
    } | undefined>>, action: {
        payload: {
            federationId: string;
        } & {
            groupId: string;
            role: string;
        };
        type: string;
    }): void;
    setChatGroupAffiliation(state: import("immer/dist/internal").WritableDraft<Record<string, {
        clientStatus: keyof import("@xmpp/connection").StatusEvents;
        clientLastOnlineAt: number;
        clientError: string | null;
        authenticatedMember: ChatMember | null;
        credentials: {
            password: string;
            keypairSeed: string;
            username: string | null;
        } | null;
        messages: ChatMessage[];
        groups: ChatGroup[];
        groupRoles: Record<string, string | undefined>;
        groupAffiliations: Record<string, string | undefined>;
        membersSeen: ChatMember[];
        lastFetchedMessageId: string | null;
        lastReadMessageTimestamps: Record<string, number | undefined>;
        lastSeenMessageTimestamp: number | null;
        encryptionKeys: Keypair | null;
        pushNotificationToken: string | null;
        websocketIsHealthy: boolean;
    } | undefined>>, action: {
        payload: {
            federationId: string;
        } & {
            groupId: string;
            affiliation: string;
        };
        type: string;
    }): void;
    addChatGroup(state: import("immer/dist/internal").WritableDraft<Record<string, {
        clientStatus: keyof import("@xmpp/connection").StatusEvents;
        clientLastOnlineAt: number;
        clientError: string | null;
        authenticatedMember: ChatMember | null;
        credentials: {
            password: string;
            keypairSeed: string;
            username: string | null;
        } | null;
        messages: ChatMessage[];
        groups: ChatGroup[];
        groupRoles: Record<string, string | undefined>;
        groupAffiliations: Record<string, string | undefined>;
        membersSeen: ChatMember[];
        lastFetchedMessageId: string | null;
        lastReadMessageTimestamps: Record<string, number | undefined>;
        lastSeenMessageTimestamp: number | null;
        encryptionKeys: Keypair | null;
        pushNotificationToken: string | null;
        websocketIsHealthy: boolean;
    } | undefined>>, action: {
        payload: {
            federationId: string;
        } & {
            group: ChatGroup;
        };
        type: string;
    }): Record<string, {
        clientStatus: keyof import("@xmpp/connection").StatusEvents;
        clientLastOnlineAt: number;
        clientError: string | null;
        authenticatedMember: ChatMember | null;
        credentials: {
            password: string;
            keypairSeed: string;
            username: string | null;
        } | null;
        messages: ChatMessage[];
        groups: ChatGroup[];
        groupRoles: Record<string, string | undefined>;
        groupAffiliations: Record<string, string | undefined>;
        membersSeen: ChatMember[];
        lastFetchedMessageId: string | null;
        lastReadMessageTimestamps: Record<string, number | undefined>;
        lastSeenMessageTimestamp: number | null;
        encryptionKeys: Keypair | null;
        pushNotificationToken: string | null;
        websocketIsHealthy: boolean;
    } | undefined>;
    setAuthenticatedMember(state: import("immer/dist/internal").WritableDraft<Record<string, {
        clientStatus: keyof import("@xmpp/connection").StatusEvents;
        clientLastOnlineAt: number;
        clientError: string | null;
        authenticatedMember: ChatMember | null;
        credentials: {
            password: string;
            keypairSeed: string;
            username: string | null;
        } | null;
        messages: ChatMessage[];
        groups: ChatGroup[];
        groupRoles: Record<string, string | undefined>;
        groupAffiliations: Record<string, string | undefined>;
        membersSeen: ChatMember[];
        lastFetchedMessageId: string | null;
        lastReadMessageTimestamps: Record<string, number | undefined>;
        lastSeenMessageTimestamp: number | null;
        encryptionKeys: Keypair | null;
        pushNotificationToken: string | null;
        websocketIsHealthy: boolean;
    } | undefined>>, action: {
        payload: {
            federationId: string;
        } & {
            authenticatedMember: ChatMember;
        };
        type: string;
    }): void;
    setChatEncryptionKeys(state: import("immer/dist/internal").WritableDraft<Record<string, {
        clientStatus: keyof import("@xmpp/connection").StatusEvents;
        clientLastOnlineAt: number;
        clientError: string | null;
        authenticatedMember: ChatMember | null;
        credentials: {
            password: string;
            keypairSeed: string;
            username: string | null;
        } | null;
        messages: ChatMessage[];
        groups: ChatGroup[];
        groupRoles: Record<string, string | undefined>;
        groupAffiliations: Record<string, string | undefined>;
        membersSeen: ChatMember[];
        lastFetchedMessageId: string | null;
        lastReadMessageTimestamps: Record<string, number | undefined>;
        lastSeenMessageTimestamp: number | null;
        encryptionKeys: Keypair | null;
        pushNotificationToken: string | null;
        websocketIsHealthy: boolean;
    } | undefined>>, action: {
        payload: {
            federationId: string;
        } & {
            encryptionKeys: Keypair;
        };
        type: string;
    }): void;
    setLastFetchedMessageId(state: import("immer/dist/internal").WritableDraft<Record<string, {
        clientStatus: keyof import("@xmpp/connection").StatusEvents;
        clientLastOnlineAt: number;
        clientError: string | null;
        authenticatedMember: ChatMember | null;
        credentials: {
            password: string;
            keypairSeed: string;
            username: string | null;
        } | null;
        messages: ChatMessage[];
        groups: ChatGroup[];
        groupRoles: Record<string, string | undefined>;
        groupAffiliations: Record<string, string | undefined>;
        membersSeen: ChatMember[];
        lastFetchedMessageId: string | null;
        lastReadMessageTimestamps: Record<string, number | undefined>;
        lastSeenMessageTimestamp: number | null;
        encryptionKeys: Keypair | null;
        pushNotificationToken: string | null;
        websocketIsHealthy: boolean;
    } | undefined>>, action: {
        payload: {
            federationId: string;
        } & {
            lastFetchedMessageId: FederationChatState['lastFetchedMessageId'];
        };
        type: string;
    }): void;
    setLastReadMessageTimestamp(state: import("immer/dist/internal").WritableDraft<Record<string, {
        clientStatus: keyof import("@xmpp/connection").StatusEvents;
        clientLastOnlineAt: number;
        clientError: string | null;
        authenticatedMember: ChatMember | null;
        credentials: {
            password: string;
            keypairSeed: string;
            username: string | null;
        } | null;
        messages: ChatMessage[];
        groups: ChatGroup[];
        groupRoles: Record<string, string | undefined>;
        groupAffiliations: Record<string, string | undefined>;
        membersSeen: ChatMember[];
        lastFetchedMessageId: string | null;
        lastReadMessageTimestamps: Record<string, number | undefined>;
        lastSeenMessageTimestamp: number | null;
        encryptionKeys: Keypair | null;
        pushNotificationToken: string | null;
        websocketIsHealthy: boolean;
    } | undefined>>, action: {
        payload: {
            federationId: string;
        } & {
            chatId: string;
            timestamp: number;
        };
        type: string;
    }): void;
    setLastSeenMessageTimestamp(state: import("immer/dist/internal").WritableDraft<Record<string, {
        clientStatus: keyof import("@xmpp/connection").StatusEvents;
        clientLastOnlineAt: number;
        clientError: string | null;
        authenticatedMember: ChatMember | null;
        credentials: {
            password: string;
            keypairSeed: string;
            username: string | null;
        } | null;
        messages: ChatMessage[];
        groups: ChatGroup[];
        groupRoles: Record<string, string | undefined>;
        groupAffiliations: Record<string, string | undefined>;
        membersSeen: ChatMember[];
        lastFetchedMessageId: string | null;
        lastReadMessageTimestamps: Record<string, number | undefined>;
        lastSeenMessageTimestamp: number | null;
        encryptionKeys: Keypair | null;
        pushNotificationToken: string | null;
        websocketIsHealthy: boolean;
    } | undefined>>, action: {
        payload: {
            federationId: string;
        } & {
            timestamp: number;
        };
        type: string;
    }): void;
    setWebsocketIsHealthy(state: import("immer/dist/internal").WritableDraft<Record<string, {
        clientStatus: keyof import("@xmpp/connection").StatusEvents;
        clientLastOnlineAt: number;
        clientError: string | null;
        authenticatedMember: ChatMember | null;
        credentials: {
            password: string;
            keypairSeed: string;
            username: string | null;
        } | null;
        messages: ChatMessage[];
        groups: ChatGroup[];
        groupRoles: Record<string, string | undefined>;
        groupAffiliations: Record<string, string | undefined>;
        membersSeen: ChatMember[];
        lastFetchedMessageId: string | null;
        lastReadMessageTimestamps: Record<string, number | undefined>;
        lastSeenMessageTimestamp: number | null;
        encryptionKeys: Keypair | null;
        pushNotificationToken: string | null;
        websocketIsHealthy: boolean;
    } | undefined>>, action: {
        payload: {
            federationId: string;
        } & {
            healthy: boolean;
        };
        type: string;
    }): void;
    resetAuthenticatedMember(state: import("immer/dist/internal").WritableDraft<Record<string, {
        clientStatus: keyof import("@xmpp/connection").StatusEvents;
        clientLastOnlineAt: number;
        clientError: string | null;
        authenticatedMember: ChatMember | null;
        credentials: {
            password: string;
            keypairSeed: string;
            username: string | null;
        } | null;
        messages: ChatMessage[];
        groups: ChatGroup[];
        groupRoles: Record<string, string | undefined>;
        groupAffiliations: Record<string, string | undefined>;
        membersSeen: ChatMember[];
        lastFetchedMessageId: string | null;
        lastReadMessageTimestamps: Record<string, number | undefined>;
        lastSeenMessageTimestamp: number | null;
        encryptionKeys: Keypair | null;
        pushNotificationToken: string | null;
        websocketIsHealthy: boolean;
    } | undefined>>, action: FederationPayloadAction): void;
    resetFederationChatState(state: import("immer/dist/internal").WritableDraft<Record<string, {
        clientStatus: keyof import("@xmpp/connection").StatusEvents;
        clientLastOnlineAt: number;
        clientError: string | null;
        authenticatedMember: ChatMember | null;
        credentials: {
            password: string;
            keypairSeed: string;
            username: string | null;
        } | null;
        messages: ChatMessage[];
        groups: ChatGroup[];
        groupRoles: Record<string, string | undefined>;
        groupAffiliations: Record<string, string | undefined>;
        membersSeen: ChatMember[];
        lastFetchedMessageId: string | null;
        lastReadMessageTimestamps: Record<string, number | undefined>;
        lastSeenMessageTimestamp: number | null;
        encryptionKeys: Keypair | null;
        pushNotificationToken: string | null;
        websocketIsHealthy: boolean;
    } | undefined>>, action: FederationPayloadAction): void;
    resetChatState(): {
        [x: string]: {
            clientStatus: keyof import("@xmpp/connection").StatusEvents;
            clientLastOnlineAt: number;
            clientError: string | null;
            authenticatedMember: ChatMember | null;
            credentials: {
                password: string;
                keypairSeed: string;
                username: string | null;
            } | null;
            messages: ChatMessage[];
            groups: ChatGroup[];
            groupRoles: Record<string, string | undefined>;
            groupAffiliations: Record<string, string | undefined>;
            membersSeen: ChatMember[];
            lastFetchedMessageId: string | null;
            lastReadMessageTimestamps: Record<string, number | undefined>;
            lastSeenMessageTimestamp: number | null;
            encryptionKeys: Keypair | null;
            pushNotificationToken: string | null;
            websocketIsHealthy: boolean;
        } | undefined;
    };
}, "chat">;
/*** Basic actions ***/
/** @deprecated XMPP legacy code */
export declare const setChatClientStatus: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: string;
} & {
    status: XmppClientStatus;
}, "chat/setChatClientStatus">, setChatClientError: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: string;
} & {
    error: string;
}, "chat/setChatClientError">, setChatMembersSeen: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: string;
} & {
    membersSeen: ChatMember[];
}, "chat/setChatMembersSeen">, addChatMemberSeen: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: string;
} & {
    member: ChatMember;
}, "chat/addChatMemberSeen">, setChatMessages: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: string;
} & {
    messages: ChatMessage[];
}, "chat/setChatMessages">, addChatMessage: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: string;
} & {
    message: ChatMessage;
}, "chat/addChatMessage">, setChatGroups: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: string;
} & {
    groups: ChatGroup[];
}, "chat/setChatGroups">, addChatGroup: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: string;
} & {
    group: ChatGroup;
}, "chat/addChatGroup">, setChatGroupRole: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: string;
} & {
    groupId: string;
    role: string;
}, "chat/setChatGroupRole">, setChatGroupAffiliation: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: string;
} & {
    groupId: string;
    affiliation: string;
}, "chat/setChatGroupAffiliation">, setAuthenticatedMember: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: string;
} & {
    authenticatedMember: ChatMember;
}, "chat/setAuthenticatedMember">, setChatEncryptionKeys: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: string;
} & {
    encryptionKeys: Keypair;
}, "chat/setChatEncryptionKeys">, setLastFetchedMessageId: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: string;
} & {
    lastFetchedMessageId: FederationChatState['lastFetchedMessageId'];
}, "chat/setLastFetchedMessageId">, setLastReadMessageTimestamp: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: string;
} & {
    chatId: string;
    timestamp: number;
}, "chat/setLastReadMessageTimestamp">, setLastSeenMessageTimestamp: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: string;
} & {
    timestamp: number;
}, "chat/setLastSeenMessageTimestamp">, setWebsocketIsHealthy: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: string;
} & {
    healthy: boolean;
}, "chat/setWebsocketIsHealthy">, resetAuthenticatedMember: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: string;
} & object, "chat/resetAuthenticatedMember">, resetFederationChatState: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: string;
} & object, "chat/resetFederationChatState">, resetChatState: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"chat/resetChatState">;
/*** Async thunk actions ***/
/** @deprecated XMPP legacy code */
export declare const refreshChatCredentials: import("@reduxjs/toolkit").AsyncThunk<{
    credentials: XmppCredentials;
    encryptionKeys: Keypair;
}, {
    fedimint: FedimintBridge;
    federationId: string;
}, {
    state?: unknown;
    /** @deprecated XMPP legacy code */
    dispatch?: import("redux").Dispatch<AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
/** @deprecated XMPP legacy code */
export declare const authenticateChat: import("@reduxjs/toolkit").AsyncThunk<ChatMember, {
    fedimint: FedimintBridge;
    federationId: string;
    username: string;
    forceCredentialRefresh?: boolean | undefined;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch<AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
/** @deprecated XMPP legacy code */
export declare const connectChat: import("@reduxjs/toolkit").AsyncThunk<void, {
    fedimint: FedimintBridge;
    federationId: string;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch<AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
/** @deprecated XMPP legacy code */
export declare const disconnectChat: import("@reduxjs/toolkit").AsyncThunk<void, {
    federationId: string;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch<AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
/** @deprecated XMPP legacy code */
export declare const ensureHealthyXmppStream: import("@reduxjs/toolkit").AsyncThunk<void, {
    fedimint: FedimintBridge;
    federationId: string;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch<AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
/** @deprecated XMPP legacy code */
export declare const fetchChatHistory: import("@reduxjs/toolkit").AsyncThunk<string | null, {
    federationId: string;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch<AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
/** @deprecated XMPP legacy code */
export declare const fetchChatMembers: import("@reduxjs/toolkit").AsyncThunk<ChatMember[], {
    federationId: string;
}, {
    state?: unknown;
    /** @deprecated XMPP legacy code */
    dispatch?: import("redux").Dispatch<AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
/** @deprecated XMPP legacy code */
export declare const fetchChatMember: import("@reduxjs/toolkit").AsyncThunk<ChatMember, {
    federationId: string;
    memberId: string;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch<AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
/** @deprecated XMPP legacy code */
export declare const refreshChatGroup: import("@reduxjs/toolkit").AsyncThunk<ChatGroup, {
    federationId: string;
    group: ChatGroup;
}, {
    state?: unknown;
    /** @deprecated XMPP legacy code */
    dispatch?: import("redux").Dispatch<AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
/** @deprecated XMPP legacy code */
export declare const joinChatGroup: import("@reduxjs/toolkit").AsyncThunk<ChatGroup, {
    federationId: string;
    link: string;
}, {
    state?: unknown;
    /** @deprecated XMPP legacy code */
    dispatch?: import("redux").Dispatch<AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
/** @deprecated XMPP legacy code */
export declare const createChatGroup: import("@reduxjs/toolkit").AsyncThunk<ChatGroup, {
    federationId: string;
    id: string;
    name: string;
    broadcastOnly?: boolean | undefined;
}, {
    state?: unknown;
    /** @deprecated XMPP legacy code */
    dispatch?: import("redux").Dispatch<AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
/** @deprecated XMPP legacy code */
export declare const leaveChatGroup: import("@reduxjs/toolkit").AsyncThunk<void, {
    federationId: string;
    groupId: string;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch<AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
/** @deprecated XMPP legacy code */
export declare const configureChatGroup: import("@reduxjs/toolkit").AsyncThunk<ChatGroup, {
    federationId: string;
    groupId: string;
    groupName: string;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch<AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
/** @deprecated XMPP legacy code */
export declare const addAdminToChatGroup: import("@reduxjs/toolkit").AsyncThunk<void, {
    federationId: string;
    groupId: string;
    memberId: string;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch<AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
/** @deprecated XMPP legacy code */
export declare const fetchChatGroupMembersList: import("@reduxjs/toolkit").AsyncThunk<ChatMember[], {
    federationId: string;
    groupId: string;
    role: XmppMemberRole;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch<AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
/** @deprecated XMPP legacy code */
export declare const removeAdminFromChatGroup: import("@reduxjs/toolkit").AsyncThunk<void, {
    federationId: string;
    groupId: string;
    memberId: string;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch<AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
/** @deprecated XMPP legacy code */
export declare const sendDirectMessage: import("@reduxjs/toolkit").AsyncThunk<ChatMessage, {
    fedimint: FedimintBridge;
    federationId: string;
    recipientId: string;
} & ({
    content: string;
} | {
    payment: ChatPayment;
}), {
    state: CommonState;
    dispatch?: import("redux").Dispatch<AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
/** @deprecated XMPP legacy code */
export declare const sendGroupMessage: import("@reduxjs/toolkit").AsyncThunk<ChatMessage, {
    federationId: string;
    groupId: string;
    content: string;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch<AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
/** @deprecated XMPP legacy code */
export declare const updateChatPayment: import("@reduxjs/toolkit").AsyncThunk<ChatMessage, {
    fedimint: FedimintBridge;
    federationId: string;
    messageId: string;
    action: 'receive' | 'pay' | 'reject' | 'cancel';
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch<AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
/** @deprecated XMPP legacy code */
export declare const sendQueuedMessages: import("@reduxjs/toolkit").AsyncThunk<void, {
    fedimint: FedimintBridge;
    federationId: string;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch<AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
/** @deprecated XMPP legacy code */
export declare const publishPushNotificationToken: import("@reduxjs/toolkit").AsyncThunk<string, {
    federationId: string;
    getToken: () => Promise<string>;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch<AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
/** @deprecated XMPP legacy code */
export declare const selectChatCredentials: (s: CommonState) => {
    password: string;
    keypairSeed: string;
    username: string | null;
} | null;
/** @deprecated XMPP legacy code */
export declare const selectChatEncryptionKeys: (s: CommonState) => Keypair | null;
/** @deprecated XMPP legacy code */
export declare const selectAuthenticatedMember: (s: CommonState) => ChatMember | null;
/** @deprecated XMPP legacy code */
export declare const selectAllChatMessages: (s: CommonState, federationId?: Federation['id']) => ChatMessage[];
/** @deprecated XMPP legacy code */
export declare const selectAllChatMembers: (s: CommonState) => ChatMember[];
/** @deprecated XMPP legacy code */
export declare const selectAllChatGroups: (s: CommonState) => ChatGroup[];
/** @deprecated XMPP legacy code */
export declare const selectAllChatGroupRoles: (s: CommonState) => Record<string, string | undefined>;
/** @deprecated XMPP legacy code */
export declare const selectAllChatGroupAffiliations: (s: CommonState) => Record<string, string | undefined>;
/** @deprecated XMPP legacy code */
export declare const selectChatClientStatus: (s: CommonState) => keyof import("@xmpp/connection").StatusEvents;
/** @deprecated XMPP legacy code */
export declare const selectChatClientLastOnlineAt: (s: CommonState) => number;
/** @deprecated XMPP legacy code */
export declare const selectChatLastReadMessageTimestamps: (s: CommonState, federationId?: Federation['id']) => Record<string, number | undefined>;
/** @deprecated XMPP legacy code */
export declare const selectChatLastSeenMessageTimestamp: (s: CommonState, federationId?: Federation['id']) => number | null;
/** @deprecated XMPP legacy code */
export declare const selectPushNotificationToken: (s: CommonState) => string | null;
/** @deprecated XMPP legacy code */
export declare const selectWebsocketIsHealthy: (s: CommonState) => boolean;
/** @deprecated XMPP legacy code */
export declare const selectChatConnectionOptions: ((state: CommonState) => import("../types").XmppConnectionOptions | null) & import("reselect").OutputSelectorFields<(args_0: Record<string, string> & import("../types").ClientConfigMetadata) => import("../types").XmppConnectionOptions & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/** @deprecated XMPP legacy code */
export declare const selectChatMemberMap: ((state: CommonState) => Record<string, ChatMember | undefined>) & import("reselect").OutputSelectorFields<(args_0: ChatMember[]) => Record<string, ChatMember | undefined> & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/** @deprecated XMPP legacy code */
export declare const selectChatGroupMap: ((state: CommonState) => Record<string, ChatGroup | undefined>) & import("reselect").OutputSelectorFields<(args_0: ChatGroup[]) => Record<string, ChatGroup | undefined> & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/** @deprecated XMPP legacy code */
export declare const selectLatestChatMessage: ((state: CommonState, federationId?: string | undefined) => ChatMessage | null) & import("reselect").OutputSelectorFields<(args_0: ChatMessage[]) => ChatMessage & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/** @deprecated XMPP legacy code */
export declare const selectLatestPaymentUpdate: ((state: CommonState, federationId?: string | undefined) => ChatMessage | null) & import("reselect").OutputSelectorFields<(args_0: ChatMessage[]) => ChatMessage & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/** @deprecated XMPP legacy code */
export declare const selectLatestChatMessageTimestamp: ((state: CommonState, federationId?: string | undefined) => number | undefined) & import("reselect").OutputSelectorFields<(args_0: ChatMessage | null) => number & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/** @deprecated XMPP legacy code */
export declare const selectLatestPaymentUpdateTimestamp: ((state: CommonState, federationId?: string | undefined) => number | undefined) & import("reselect").OutputSelectorFields<(args_0: ChatMessage | null) => number & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/** @deprecated XMPP legacy code */
export declare const selectOrderedChatMessages: ((state: CommonState, federationId?: string | undefined) => ChatMessage[]) & import("reselect").OutputSelectorFields<(args_0: ChatMessage[]) => ChatMessage[] & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/** @deprecated XMPP legacy code */
export declare const selectOrderedChatList: ((state: CommonState, federationId?: string | undefined) => ChatWithLatestMessage[]) & import("reselect").OutputSelectorFields<(args_0: ChatMessage[], args_1: Record<string, ChatMember | undefined>, args_2: Record<string, ChatGroup | undefined>, args_3: ChatMember | null, args_4: Record<string, number | undefined>) => ChatWithLatestMessage[] & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/** @deprecated XMPP legacy code */
export declare const selectIsChatEmpty: (s: CommonState) => boolean;
/**
 * Returns whether or not the user needs to register a username on the chat server
 * @deprecated XMPP legacy code
 */
export declare const selectNeedsChatRegistration: (s: CommonState) => boolean;
/**
 * Returns members who have sent us messages recently. Optionally
 * takes in an argument of the number to return, defaults to 4.
 * @deprecated XMPP legacy code
 */
export declare const selectRecentChatMembers: ((state: CommonState, limit?: number | undefined) => ChatMember[]) & import("reselect").OutputSelectorFields<(args_0: ChatMessage[], args_1: Record<string, ChatMember | undefined>, args_2: ChatMember | null, args_3: number) => ChatMember[] & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/** @deprecated XMPP legacy code */
export declare const selectChat: ((state: CommonState, chatId: string) => ChatWithLatestMessage | undefined) & import("reselect").OutputSelectorFields<(args_0: ChatWithLatestMessage[], args_1: string) => ChatWithLatestMessage & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/** @deprecated XMPP legacy code */
export declare const selectChatMessages: ((state: CommonState, chatId: string) => ChatMessage[]) & import("reselect").OutputSelectorFields<(args_0: ChatMember | null, args_1: ChatMessage[], args_2: string) => ChatMessage[] & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/** @deprecated XMPP legacy code */
export declare const selectChatMember: ((state: CommonState, memberId: string) => ChatMember | undefined) & import("reselect").OutputSelectorFields<(args_0: ChatMember[], args_1: string) => ChatMember & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/** @deprecated XMPP legacy code */
export declare const selectChatMembersWithHistory: ((state: CommonState, federationId?: string | undefined) => ChatMember[]) & import("reselect").OutputSelectorFields<(args_0: ChatMember[], args_1: ChatMessage[]) => ChatMember[] & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/** @deprecated XMPP legacy code */
export declare const selectChatGroup: ((state: CommonState, groupId: string) => ChatGroup | undefined) & import("reselect").OutputSelectorFields<(args_0: ChatGroup[], args_1: string) => ChatGroup & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/** @deprecated XMPP legacy code */
export declare const selectHasUnseenMessages: ((state: CommonState, federationId?: string | undefined) => boolean) & import("reselect").OutputSelectorFields<(args_0: number | undefined, args_1: number | null) => boolean & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/** @deprecated XMPP legacy code */
export declare const selectHasUnseenPaymentUpdates: ((state: CommonState, federationId?: string | undefined) => boolean) & import("reselect").OutputSelectorFields<(args_0: number | undefined, args_1: number | null) => boolean & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/** @deprecated XMPP legacy code */
export declare const selectHasNewChatActivityInOtherFeds: ((state: CommonState) => boolean) & import("reselect").OutputSelectorFields<(args_0: CommonState, args_1: Federation[], args_2: string | undefined) => boolean & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/** @deprecated XMPP legacy code */
export declare const selectChatGroupRole: ((state: CommonState, chatId: string) => ChatRole) & import("reselect").OutputSelectorFields<(args_0: Record<string, string | undefined>, args_1: string) => ChatRole & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/** @deprecated XMPP legacy code */
export declare const selectChatGroupAffiliation: ((state: CommonState, chatId: string) => ChatAffiliation) & import("reselect").OutputSelectorFields<(args_0: Record<string, string | undefined>, args_1: string) => ChatAffiliation & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/** @deprecated XMPP legacy code */
export declare const selectChatDefaultGroupIds: ((state: CommonState) => string[]) & import("reselect").OutputSelectorFields<(args_0: Federation | undefined) => string[] & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/**
 * Selects the XmppChatClient for the currently active federation.
 * Only returns the client if it is online and ready to send and receive
 * XMPP messages, otherwise return null.
 * @deprecated XMPP legacy code
 */
export declare const selectChatXmppClient: (s: CommonState) => XmppChatClient | null;
export {};
