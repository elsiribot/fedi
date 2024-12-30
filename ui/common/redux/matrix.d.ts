import { PayloadAction } from '@reduxjs/toolkit';
import { CommonState } from '.';
import { InputMedia, MatrixAuth, MatrixError, MatrixEvent, MatrixGroupPreview, MatrixPaymentEvent, MatrixPowerLevel, MatrixRoom, MatrixRoomListItem, MatrixRoomListObservableUpdates, MatrixRoomMember, MatrixRoomPowerLevels, MatrixSearchResults, MatrixSyncStatus, MatrixTimelineItem, MatrixTimelineObservableUpdates, MatrixUser, Sats } from '../types';
import { RpcRoomNotificationMode } from '../types/bindings';
import { FedimintBridge } from '../utils/fedimint';
import { MatrixEventContentType } from '../utils/matrix';
/*** Initial State ***/
declare const initialState: {
    started: boolean;
    auth: null | MatrixAuth;
    status: MatrixSyncStatus;
    roomList: MatrixRoomListItem[];
    roomInfo: Record<MatrixRoom["id"], MatrixRoom | undefined>;
    roomMembers: Record<MatrixRoom["id"], MatrixRoomMember[] | undefined>;
    roomTimelines: Record<MatrixRoom["id"], MatrixTimelineItem[] | undefined>;
    roomPowerLevels: Record<MatrixRoom["id"], MatrixRoomPowerLevels | undefined>;
    roomNotificationMode: Record<MatrixRoom["id"], RpcRoomNotificationMode | undefined>;
    users: Record<MatrixUser["id"], MatrixUser | undefined>;
    errors: MatrixError[];
    pushNotificationToken: string | null;
    groupPreviews: Record<MatrixRoom["id"], MatrixGroupPreview>;
    drafts: Record<MatrixRoom["id"], string>;
    selectedChatMessage: MatrixEvent<MatrixEventContentType<"m.text" | "m.image" | "m.video" | "m.file">> | null;
    messageToEdit: MatrixEvent<MatrixEventContentType<"m.text">> | null;
    previewMedia: Array<{
        visible: boolean;
        media: InputMedia;
    }>;
};
export type MatrixState = typeof initialState;
/*** Slice definition ***/
export declare const matrixSlice: import("@reduxjs/toolkit").Slice<{
    started: boolean;
    auth: null | MatrixAuth;
    status: MatrixSyncStatus;
    roomList: MatrixRoomListItem[];
    roomInfo: Record<MatrixRoom["id"], MatrixRoom | undefined>;
    roomMembers: Record<MatrixRoom["id"], MatrixRoomMember[] | undefined>;
    roomTimelines: Record<MatrixRoom["id"], MatrixTimelineItem[] | undefined>;
    roomPowerLevels: Record<MatrixRoom["id"], MatrixRoomPowerLevels | undefined>;
    roomNotificationMode: Record<MatrixRoom["id"], RpcRoomNotificationMode | undefined>;
    users: Record<MatrixUser["id"], MatrixUser | undefined>;
    errors: MatrixError[];
    pushNotificationToken: string | null;
    groupPreviews: Record<MatrixRoom["id"], MatrixGroupPreview>;
    drafts: Record<MatrixRoom["id"], string>;
    selectedChatMessage: MatrixEvent<MatrixEventContentType<"m.text" | "m.image" | "m.video" | "m.file">> | null;
    messageToEdit: MatrixEvent<MatrixEventContentType<"m.text">> | null;
    previewMedia: Array<{
        visible: boolean;
        media: InputMedia;
    }>;
}, {
    setMatrixStatus(state: import("immer/dist/internal").WritableDraft<{
        started: boolean;
        auth: null | MatrixAuth;
        status: MatrixSyncStatus;
        roomList: MatrixRoomListItem[];
        roomInfo: Record<MatrixRoom["id"], MatrixRoom | undefined>;
        roomMembers: Record<MatrixRoom["id"], MatrixRoomMember[] | undefined>;
        roomTimelines: Record<MatrixRoom["id"], MatrixTimelineItem[] | undefined>;
        roomPowerLevels: Record<MatrixRoom["id"], MatrixRoomPowerLevels | undefined>;
        roomNotificationMode: Record<MatrixRoom["id"], RpcRoomNotificationMode | undefined>;
        users: Record<MatrixUser["id"], MatrixUser | undefined>;
        errors: MatrixError[];
        pushNotificationToken: string | null;
        groupPreviews: Record<MatrixRoom["id"], MatrixGroupPreview>;
        drafts: Record<MatrixRoom["id"], string>;
        selectedChatMessage: MatrixEvent<MatrixEventContentType<"m.text" | "m.image" | "m.video" | "m.file">> | null;
        messageToEdit: MatrixEvent<MatrixEventContentType<"m.text">> | null;
        previewMedia: Array<{
            visible: boolean;
            media: InputMedia;
        }>;
    }>, action: PayloadAction<MatrixState["status"]>): void;
    setMatrixAuth(state: import("immer/dist/internal").WritableDraft<{
        started: boolean;
        auth: null | MatrixAuth;
        status: MatrixSyncStatus;
        roomList: MatrixRoomListItem[];
        roomInfo: Record<MatrixRoom["id"], MatrixRoom | undefined>;
        roomMembers: Record<MatrixRoom["id"], MatrixRoomMember[] | undefined>;
        roomTimelines: Record<MatrixRoom["id"], MatrixTimelineItem[] | undefined>;
        roomPowerLevels: Record<MatrixRoom["id"], MatrixRoomPowerLevels | undefined>;
        roomNotificationMode: Record<MatrixRoom["id"], RpcRoomNotificationMode | undefined>;
        users: Record<MatrixUser["id"], MatrixUser | undefined>;
        errors: MatrixError[];
        pushNotificationToken: string | null;
        groupPreviews: Record<MatrixRoom["id"], MatrixGroupPreview>;
        drafts: Record<MatrixRoom["id"], string>;
        selectedChatMessage: MatrixEvent<MatrixEventContentType<"m.text" | "m.image" | "m.video" | "m.file">> | null;
        messageToEdit: MatrixEvent<MatrixEventContentType<"m.text">> | null;
        previewMedia: Array<{
            visible: boolean;
            media: InputMedia;
        }>;
    }>, action: PayloadAction<MatrixState["auth"]>): void;
    addMatrixRoomInfo(state: import("immer/dist/internal").WritableDraft<{
        started: boolean;
        auth: null | MatrixAuth;
        status: MatrixSyncStatus;
        roomList: MatrixRoomListItem[];
        roomInfo: Record<MatrixRoom["id"], MatrixRoom | undefined>;
        roomMembers: Record<MatrixRoom["id"], MatrixRoomMember[] | undefined>;
        roomTimelines: Record<MatrixRoom["id"], MatrixTimelineItem[] | undefined>;
        roomPowerLevels: Record<MatrixRoom["id"], MatrixRoomPowerLevels | undefined>;
        roomNotificationMode: Record<MatrixRoom["id"], RpcRoomNotificationMode | undefined>;
        users: Record<MatrixUser["id"], MatrixUser | undefined>;
        errors: MatrixError[];
        pushNotificationToken: string | null;
        groupPreviews: Record<MatrixRoom["id"], MatrixGroupPreview>;
        drafts: Record<MatrixRoom["id"], string>;
        selectedChatMessage: MatrixEvent<MatrixEventContentType<"m.text" | "m.image" | "m.video" | "m.file">> | null;
        messageToEdit: MatrixEvent<MatrixEventContentType<"m.text">> | null;
        previewMedia: Array<{
            visible: boolean;
            media: InputMedia;
        }>;
    }>, action: PayloadAction<MatrixRoom>): void;
    handleMatrixRoomListObservableUpdates(state: import("immer/dist/internal").WritableDraft<{
        started: boolean;
        auth: null | MatrixAuth;
        status: MatrixSyncStatus;
        roomList: MatrixRoomListItem[];
        roomInfo: Record<MatrixRoom["id"], MatrixRoom | undefined>;
        roomMembers: Record<MatrixRoom["id"], MatrixRoomMember[] | undefined>;
        roomTimelines: Record<MatrixRoom["id"], MatrixTimelineItem[] | undefined>;
        roomPowerLevels: Record<MatrixRoom["id"], MatrixRoomPowerLevels | undefined>;
        roomNotificationMode: Record<MatrixRoom["id"], RpcRoomNotificationMode | undefined>;
        users: Record<MatrixUser["id"], MatrixUser | undefined>;
        errors: MatrixError[];
        pushNotificationToken: string | null;
        groupPreviews: Record<MatrixRoom["id"], MatrixGroupPreview>;
        drafts: Record<MatrixRoom["id"], string>;
        selectedChatMessage: MatrixEvent<MatrixEventContentType<"m.text" | "m.image" | "m.video" | "m.file">> | null;
        messageToEdit: MatrixEvent<MatrixEventContentType<"m.text">> | null;
        previewMedia: Array<{
            visible: boolean;
            media: InputMedia;
        }>;
    }>, action: PayloadAction<MatrixRoomListObservableUpdates>): void;
    addMatrixRoomMember(state: import("immer/dist/internal").WritableDraft<{
        started: boolean;
        auth: null | MatrixAuth;
        status: MatrixSyncStatus;
        roomList: MatrixRoomListItem[];
        roomInfo: Record<MatrixRoom["id"], MatrixRoom | undefined>;
        roomMembers: Record<MatrixRoom["id"], MatrixRoomMember[] | undefined>;
        roomTimelines: Record<MatrixRoom["id"], MatrixTimelineItem[] | undefined>;
        roomPowerLevels: Record<MatrixRoom["id"], MatrixRoomPowerLevels | undefined>;
        roomNotificationMode: Record<MatrixRoom["id"], RpcRoomNotificationMode | undefined>;
        users: Record<MatrixUser["id"], MatrixUser | undefined>;
        errors: MatrixError[];
        pushNotificationToken: string | null;
        groupPreviews: Record<MatrixRoom["id"], MatrixGroupPreview>;
        drafts: Record<MatrixRoom["id"], string>;
        selectedChatMessage: MatrixEvent<MatrixEventContentType<"m.text" | "m.image" | "m.video" | "m.file">> | null;
        messageToEdit: MatrixEvent<MatrixEventContentType<"m.text">> | null;
        previewMedia: Array<{
            visible: boolean;
            media: InputMedia;
        }>;
    }>, action: PayloadAction<MatrixRoomMember>): void;
    setMatrixRoomMembers(state: import("immer/dist/internal").WritableDraft<{
        started: boolean;
        auth: null | MatrixAuth;
        status: MatrixSyncStatus;
        roomList: MatrixRoomListItem[];
        roomInfo: Record<MatrixRoom["id"], MatrixRoom | undefined>;
        roomMembers: Record<MatrixRoom["id"], MatrixRoomMember[] | undefined>;
        roomTimelines: Record<MatrixRoom["id"], MatrixTimelineItem[] | undefined>;
        roomPowerLevels: Record<MatrixRoom["id"], MatrixRoomPowerLevels | undefined>;
        roomNotificationMode: Record<MatrixRoom["id"], RpcRoomNotificationMode | undefined>;
        users: Record<MatrixUser["id"], MatrixUser | undefined>;
        errors: MatrixError[];
        pushNotificationToken: string | null;
        groupPreviews: Record<MatrixRoom["id"], MatrixGroupPreview>;
        drafts: Record<MatrixRoom["id"], string>;
        selectedChatMessage: MatrixEvent<MatrixEventContentType<"m.text" | "m.image" | "m.video" | "m.file">> | null;
        messageToEdit: MatrixEvent<MatrixEventContentType<"m.text">> | null;
        previewMedia: Array<{
            visible: boolean;
            media: InputMedia;
        }>;
    }>, action: PayloadAction<{
        roomId: MatrixRoom["id"];
        members: MatrixRoomMember[];
    }>): void;
    addMatrixUser(state: import("immer/dist/internal").WritableDraft<{
        started: boolean;
        auth: null | MatrixAuth;
        status: MatrixSyncStatus;
        roomList: MatrixRoomListItem[];
        roomInfo: Record<MatrixRoom["id"], MatrixRoom | undefined>;
        roomMembers: Record<MatrixRoom["id"], MatrixRoomMember[] | undefined>;
        roomTimelines: Record<MatrixRoom["id"], MatrixTimelineItem[] | undefined>;
        roomPowerLevels: Record<MatrixRoom["id"], MatrixRoomPowerLevels | undefined>;
        roomNotificationMode: Record<MatrixRoom["id"], RpcRoomNotificationMode | undefined>;
        users: Record<MatrixUser["id"], MatrixUser | undefined>;
        errors: MatrixError[];
        pushNotificationToken: string | null;
        groupPreviews: Record<MatrixRoom["id"], MatrixGroupPreview>;
        drafts: Record<MatrixRoom["id"], string>;
        selectedChatMessage: MatrixEvent<MatrixEventContentType<"m.text" | "m.image" | "m.video" | "m.file">> | null;
        messageToEdit: MatrixEvent<MatrixEventContentType<"m.text">> | null;
        previewMedia: Array<{
            visible: boolean;
            media: InputMedia;
        }>;
    }>, action: PayloadAction<MatrixUser>): void;
    setMatrixUsers(state: import("immer/dist/internal").WritableDraft<{
        started: boolean;
        auth: null | MatrixAuth;
        status: MatrixSyncStatus;
        roomList: MatrixRoomListItem[];
        roomInfo: Record<MatrixRoom["id"], MatrixRoom | undefined>;
        roomMembers: Record<MatrixRoom["id"], MatrixRoomMember[] | undefined>;
        roomTimelines: Record<MatrixRoom["id"], MatrixTimelineItem[] | undefined>;
        roomPowerLevels: Record<MatrixRoom["id"], MatrixRoomPowerLevels | undefined>;
        roomNotificationMode: Record<MatrixRoom["id"], RpcRoomNotificationMode | undefined>;
        users: Record<MatrixUser["id"], MatrixUser | undefined>;
        errors: MatrixError[];
        pushNotificationToken: string | null;
        groupPreviews: Record<MatrixRoom["id"], MatrixGroupPreview>;
        drafts: Record<MatrixRoom["id"], string>;
        selectedChatMessage: MatrixEvent<MatrixEventContentType<"m.text" | "m.image" | "m.video" | "m.file">> | null;
        messageToEdit: MatrixEvent<MatrixEventContentType<"m.text">> | null;
        previewMedia: Array<{
            visible: boolean;
            media: InputMedia;
        }>;
    }>, action: PayloadAction<MatrixUser[]>): void;
    handleMatrixRoomTimelineObservableUpdates(state: import("immer/dist/internal").WritableDraft<{
        started: boolean;
        auth: null | MatrixAuth;
        status: MatrixSyncStatus;
        roomList: MatrixRoomListItem[];
        roomInfo: Record<MatrixRoom["id"], MatrixRoom | undefined>;
        roomMembers: Record<MatrixRoom["id"], MatrixRoomMember[] | undefined>;
        roomTimelines: Record<MatrixRoom["id"], MatrixTimelineItem[] | undefined>;
        roomPowerLevels: Record<MatrixRoom["id"], MatrixRoomPowerLevels | undefined>;
        roomNotificationMode: Record<MatrixRoom["id"], RpcRoomNotificationMode | undefined>;
        users: Record<MatrixUser["id"], MatrixUser | undefined>;
        errors: MatrixError[];
        pushNotificationToken: string | null;
        groupPreviews: Record<MatrixRoom["id"], MatrixGroupPreview>;
        drafts: Record<MatrixRoom["id"], string>;
        selectedChatMessage: MatrixEvent<MatrixEventContentType<"m.text" | "m.image" | "m.video" | "m.file">> | null;
        messageToEdit: MatrixEvent<MatrixEventContentType<"m.text">> | null;
        previewMedia: Array<{
            visible: boolean;
            media: InputMedia;
        }>;
    }>, action: PayloadAction<{
        roomId: string;
        updates: MatrixTimelineObservableUpdates;
    }>): void;
    setMatrixRoomPowerLevels(state: import("immer/dist/internal").WritableDraft<{
        started: boolean;
        auth: null | MatrixAuth;
        status: MatrixSyncStatus;
        roomList: MatrixRoomListItem[];
        roomInfo: Record<MatrixRoom["id"], MatrixRoom | undefined>;
        roomMembers: Record<MatrixRoom["id"], MatrixRoomMember[] | undefined>;
        roomTimelines: Record<MatrixRoom["id"], MatrixTimelineItem[] | undefined>;
        roomPowerLevels: Record<MatrixRoom["id"], MatrixRoomPowerLevels | undefined>;
        roomNotificationMode: Record<MatrixRoom["id"], RpcRoomNotificationMode | undefined>;
        users: Record<MatrixUser["id"], MatrixUser | undefined>;
        errors: MatrixError[];
        pushNotificationToken: string | null;
        groupPreviews: Record<MatrixRoom["id"], MatrixGroupPreview>;
        drafts: Record<MatrixRoom["id"], string>;
        selectedChatMessage: MatrixEvent<MatrixEventContentType<"m.text" | "m.image" | "m.video" | "m.file">> | null;
        messageToEdit: MatrixEvent<MatrixEventContentType<"m.text">> | null;
        previewMedia: Array<{
            visible: boolean;
            media: InputMedia;
        }>;
    }>, action: PayloadAction<{
        roomId: MatrixRoom["id"];
        powerLevels: MatrixRoomPowerLevels;
    }>): void;
    setMatrixRoomNotificationMode(state: import("immer/dist/internal").WritableDraft<{
        started: boolean;
        auth: null | MatrixAuth;
        status: MatrixSyncStatus;
        roomList: MatrixRoomListItem[];
        roomInfo: Record<MatrixRoom["id"], MatrixRoom | undefined>;
        roomMembers: Record<MatrixRoom["id"], MatrixRoomMember[] | undefined>;
        roomTimelines: Record<MatrixRoom["id"], MatrixTimelineItem[] | undefined>;
        roomPowerLevels: Record<MatrixRoom["id"], MatrixRoomPowerLevels | undefined>;
        roomNotificationMode: Record<MatrixRoom["id"], RpcRoomNotificationMode | undefined>;
        users: Record<MatrixUser["id"], MatrixUser | undefined>;
        errors: MatrixError[];
        pushNotificationToken: string | null;
        groupPreviews: Record<MatrixRoom["id"], MatrixGroupPreview>;
        drafts: Record<MatrixRoom["id"], string>;
        selectedChatMessage: MatrixEvent<MatrixEventContentType<"m.text" | "m.image" | "m.video" | "m.file">> | null;
        messageToEdit: MatrixEvent<MatrixEventContentType<"m.text">> | null;
        previewMedia: Array<{
            visible: boolean;
            media: InputMedia;
        }>;
    }>, action: PayloadAction<{
        roomId: MatrixRoom["id"];
        mode: RpcRoomNotificationMode;
    }>): void;
    addMatrixError(state: import("immer/dist/internal").WritableDraft<{
        started: boolean;
        auth: null | MatrixAuth;
        status: MatrixSyncStatus;
        roomList: MatrixRoomListItem[];
        roomInfo: Record<MatrixRoom["id"], MatrixRoom | undefined>;
        roomMembers: Record<MatrixRoom["id"], MatrixRoomMember[] | undefined>;
        roomTimelines: Record<MatrixRoom["id"], MatrixTimelineItem[] | undefined>;
        roomPowerLevels: Record<MatrixRoom["id"], MatrixRoomPowerLevels | undefined>;
        roomNotificationMode: Record<MatrixRoom["id"], RpcRoomNotificationMode | undefined>;
        users: Record<MatrixUser["id"], MatrixUser | undefined>;
        errors: MatrixError[];
        pushNotificationToken: string | null;
        groupPreviews: Record<MatrixRoom["id"], MatrixGroupPreview>;
        drafts: Record<MatrixRoom["id"], string>;
        selectedChatMessage: MatrixEvent<MatrixEventContentType<"m.text" | "m.image" | "m.video" | "m.file">> | null;
        messageToEdit: MatrixEvent<MatrixEventContentType<"m.text">> | null;
        previewMedia: Array<{
            visible: boolean;
            media: InputMedia;
        }>;
    }>, action: PayloadAction<MatrixError>): void;
    resetMatrixState(): {
        started: boolean;
        auth: null | MatrixAuth;
        status: MatrixSyncStatus;
        roomList: MatrixRoomListItem[];
        roomInfo: Record<MatrixRoom["id"], MatrixRoom | undefined>;
        roomMembers: Record<MatrixRoom["id"], MatrixRoomMember[] | undefined>;
        roomTimelines: Record<MatrixRoom["id"], MatrixTimelineItem[] | undefined>;
        roomPowerLevels: Record<MatrixRoom["id"], MatrixRoomPowerLevels | undefined>;
        roomNotificationMode: Record<MatrixRoom["id"], RpcRoomNotificationMode | undefined>;
        users: Record<MatrixUser["id"], MatrixUser | undefined>;
        errors: MatrixError[];
        pushNotificationToken: string | null;
        groupPreviews: Record<MatrixRoom["id"], MatrixGroupPreview>;
        drafts: Record<MatrixRoom["id"], string>;
        selectedChatMessage: MatrixEvent<MatrixEventContentType<"m.text" | "m.image" | "m.video" | "m.file">> | null;
        messageToEdit: MatrixEvent<MatrixEventContentType<"m.text">> | null;
        previewMedia: Array<{
            visible: boolean;
            media: InputMedia;
        }>;
    };
    setChatDraft(state: import("immer/dist/internal").WritableDraft<{
        started: boolean;
        auth: null | MatrixAuth;
        status: MatrixSyncStatus;
        roomList: MatrixRoomListItem[];
        roomInfo: Record<MatrixRoom["id"], MatrixRoom | undefined>;
        roomMembers: Record<MatrixRoom["id"], MatrixRoomMember[] | undefined>;
        roomTimelines: Record<MatrixRoom["id"], MatrixTimelineItem[] | undefined>;
        roomPowerLevels: Record<MatrixRoom["id"], MatrixRoomPowerLevels | undefined>;
        roomNotificationMode: Record<MatrixRoom["id"], RpcRoomNotificationMode | undefined>;
        users: Record<MatrixUser["id"], MatrixUser | undefined>;
        errors: MatrixError[];
        pushNotificationToken: string | null;
        groupPreviews: Record<MatrixRoom["id"], MatrixGroupPreview>;
        drafts: Record<MatrixRoom["id"], string>;
        selectedChatMessage: MatrixEvent<MatrixEventContentType<"m.text" | "m.image" | "m.video" | "m.file">> | null;
        messageToEdit: MatrixEvent<MatrixEventContentType<"m.text">> | null;
        previewMedia: Array<{
            visible: boolean;
            media: InputMedia;
        }>;
    }>, action: PayloadAction<{
        roomId: MatrixRoom["id"];
        text: string;
    }>): void;
    setSelectedChatMessage(state: import("immer/dist/internal").WritableDraft<{
        started: boolean;
        auth: null | MatrixAuth;
        status: MatrixSyncStatus;
        roomList: MatrixRoomListItem[];
        roomInfo: Record<MatrixRoom["id"], MatrixRoom | undefined>;
        roomMembers: Record<MatrixRoom["id"], MatrixRoomMember[] | undefined>;
        roomTimelines: Record<MatrixRoom["id"], MatrixTimelineItem[] | undefined>;
        roomPowerLevels: Record<MatrixRoom["id"], MatrixRoomPowerLevels | undefined>;
        roomNotificationMode: Record<MatrixRoom["id"], RpcRoomNotificationMode | undefined>;
        users: Record<MatrixUser["id"], MatrixUser | undefined>;
        errors: MatrixError[];
        pushNotificationToken: string | null;
        groupPreviews: Record<MatrixRoom["id"], MatrixGroupPreview>;
        drafts: Record<MatrixRoom["id"], string>;
        selectedChatMessage: MatrixEvent<MatrixEventContentType<"m.text" | "m.image" | "m.video" | "m.file">> | null;
        messageToEdit: MatrixEvent<MatrixEventContentType<"m.text">> | null;
        previewMedia: Array<{
            visible: boolean;
            media: InputMedia;
        }>;
    }>, action: PayloadAction<MatrixEvent<MatrixEventContentType<"m.text" | "m.image" | "m.video" | "m.file">> | null>): void;
    setMessageToEdit(state: import("immer/dist/internal").WritableDraft<{
        started: boolean;
        auth: null | MatrixAuth;
        status: MatrixSyncStatus;
        roomList: MatrixRoomListItem[];
        roomInfo: Record<MatrixRoom["id"], MatrixRoom | undefined>;
        roomMembers: Record<MatrixRoom["id"], MatrixRoomMember[] | undefined>;
        roomTimelines: Record<MatrixRoom["id"], MatrixTimelineItem[] | undefined>;
        roomPowerLevels: Record<MatrixRoom["id"], MatrixRoomPowerLevels | undefined>;
        roomNotificationMode: Record<MatrixRoom["id"], RpcRoomNotificationMode | undefined>;
        users: Record<MatrixUser["id"], MatrixUser | undefined>;
        errors: MatrixError[];
        pushNotificationToken: string | null;
        groupPreviews: Record<MatrixRoom["id"], MatrixGroupPreview>;
        drafts: Record<MatrixRoom["id"], string>;
        selectedChatMessage: MatrixEvent<MatrixEventContentType<"m.text" | "m.image" | "m.video" | "m.file">> | null;
        messageToEdit: MatrixEvent<MatrixEventContentType<"m.text">> | null;
        previewMedia: Array<{
            visible: boolean;
            media: InputMedia;
        }>;
    }>, action: PayloadAction<MatrixEvent<MatrixEventContentType<"m.text">> | null>): void;
    addPreviewMedia(state: import("immer/dist/internal").WritableDraft<{
        started: boolean;
        auth: null | MatrixAuth;
        status: MatrixSyncStatus;
        roomList: MatrixRoomListItem[];
        roomInfo: Record<MatrixRoom["id"], MatrixRoom | undefined>;
        roomMembers: Record<MatrixRoom["id"], MatrixRoomMember[] | undefined>;
        roomTimelines: Record<MatrixRoom["id"], MatrixTimelineItem[] | undefined>;
        roomPowerLevels: Record<MatrixRoom["id"], MatrixRoomPowerLevels | undefined>;
        roomNotificationMode: Record<MatrixRoom["id"], RpcRoomNotificationMode | undefined>;
        users: Record<MatrixUser["id"], MatrixUser | undefined>;
        errors: MatrixError[];
        pushNotificationToken: string | null;
        groupPreviews: Record<MatrixRoom["id"], MatrixGroupPreview>;
        drafts: Record<MatrixRoom["id"], string>;
        selectedChatMessage: MatrixEvent<MatrixEventContentType<"m.text" | "m.image" | "m.video" | "m.file">> | null;
        messageToEdit: MatrixEvent<MatrixEventContentType<"m.text">> | null;
        previewMedia: Array<{
            visible: boolean;
            media: InputMedia;
        }>;
    }>, action: PayloadAction<Array<InputMedia>>): void;
    matchAndRemovePreviewMedia(state: import("immer/dist/internal").WritableDraft<{
        started: boolean;
        auth: null | MatrixAuth;
        status: MatrixSyncStatus;
        roomList: MatrixRoomListItem[];
        roomInfo: Record<MatrixRoom["id"], MatrixRoom | undefined>;
        roomMembers: Record<MatrixRoom["id"], MatrixRoomMember[] | undefined>;
        roomTimelines: Record<MatrixRoom["id"], MatrixTimelineItem[] | undefined>;
        roomPowerLevels: Record<MatrixRoom["id"], MatrixRoomPowerLevels | undefined>;
        roomNotificationMode: Record<MatrixRoom["id"], RpcRoomNotificationMode | undefined>;
        users: Record<MatrixUser["id"], MatrixUser | undefined>;
        errors: MatrixError[];
        pushNotificationToken: string | null;
        groupPreviews: Record<MatrixRoom["id"], MatrixGroupPreview>;
        drafts: Record<MatrixRoom["id"], string>;
        selectedChatMessage: MatrixEvent<MatrixEventContentType<"m.text" | "m.image" | "m.video" | "m.file">> | null;
        messageToEdit: MatrixEvent<MatrixEventContentType<"m.text">> | null;
        previewMedia: Array<{
            visible: boolean;
            media: InputMedia;
        }>;
    }>, action: PayloadAction<MatrixEventContentType<"m.image" | "m.video">>): void;
    matchAndHidePreviewMedia(state: import("immer/dist/internal").WritableDraft<{
        started: boolean;
        auth: null | MatrixAuth;
        status: MatrixSyncStatus;
        roomList: MatrixRoomListItem[];
        roomInfo: Record<MatrixRoom["id"], MatrixRoom | undefined>;
        roomMembers: Record<MatrixRoom["id"], MatrixRoomMember[] | undefined>;
        roomTimelines: Record<MatrixRoom["id"], MatrixTimelineItem[] | undefined>;
        roomPowerLevels: Record<MatrixRoom["id"], MatrixRoomPowerLevels | undefined>;
        roomNotificationMode: Record<MatrixRoom["id"], RpcRoomNotificationMode | undefined>;
        users: Record<MatrixUser["id"], MatrixUser | undefined>;
        errors: MatrixError[];
        pushNotificationToken: string | null;
        groupPreviews: Record<MatrixRoom["id"], MatrixGroupPreview>;
        drafts: Record<MatrixRoom["id"], string>;
        selectedChatMessage: MatrixEvent<MatrixEventContentType<"m.text" | "m.image" | "m.video" | "m.file">> | null;
        messageToEdit: MatrixEvent<MatrixEventContentType<"m.text">> | null;
        previewMedia: Array<{
            visible: boolean;
            media: InputMedia;
        }>;
    }>, action: PayloadAction<Array<MatrixEvent<MatrixEventContentType<"m.image" | "m.video">>>>): void;
}, "matrix">;
/*** Basic actions ***/
export declare const setMatrixStatus: import("@reduxjs/toolkit").ActionCreatorWithPayload<MatrixSyncStatus, "matrix/setMatrixStatus">, setMatrixAuth: import("@reduxjs/toolkit").ActionCreatorWithPayload<MatrixAuth | null, "matrix/setMatrixAuth">, addMatrixRoomInfo: import("@reduxjs/toolkit").ActionCreatorWithPayload<MatrixRoom, "matrix/addMatrixRoomInfo">, addMatrixRoomMember: import("@reduxjs/toolkit").ActionCreatorWithPayload<MatrixRoomMember, "matrix/addMatrixRoomMember">, setMatrixRoomMembers: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    roomId: MatrixRoom["id"];
    members: MatrixRoomMember[];
}, "matrix/setMatrixRoomMembers">, addMatrixUser: import("@reduxjs/toolkit").ActionCreatorWithPayload<MatrixUser, "matrix/addMatrixUser">, setMatrixUsers: import("@reduxjs/toolkit").ActionCreatorWithPayload<MatrixUser[], "matrix/setMatrixUsers">, setMatrixRoomPowerLevels: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    roomId: MatrixRoom["id"];
    powerLevels: MatrixRoomPowerLevels;
}, "matrix/setMatrixRoomPowerLevels">, setMatrixRoomNotificationMode: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    roomId: MatrixRoom["id"];
    mode: RpcRoomNotificationMode;
}, "matrix/setMatrixRoomNotificationMode">, addMatrixError: import("@reduxjs/toolkit").ActionCreatorWithPayload<Error, "matrix/addMatrixError">, handleMatrixRoomListObservableUpdates: import("@reduxjs/toolkit").ActionCreatorWithPayload<import("../types/bindings").SerdeVectorDiff<MatrixRoomListItem>[], "matrix/handleMatrixRoomListObservableUpdates">, handleMatrixRoomTimelineObservableUpdates: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    roomId: string;
    updates: MatrixTimelineObservableUpdates;
}, "matrix/handleMatrixRoomTimelineObservableUpdates">, resetMatrixState: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"matrix/resetMatrixState">, setChatDraft: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    roomId: MatrixRoom["id"];
    text: string;
}, "matrix/setChatDraft">, setSelectedChatMessage: import("@reduxjs/toolkit").ActionCreatorWithPayload<MatrixEvent<{
    msgtype: "m.text";
    body: string;
} | {
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
} | {
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
} | {
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
}> | null, "matrix/setSelectedChatMessage">, setMessageToEdit: import("@reduxjs/toolkit").ActionCreatorWithPayload<MatrixEvent<{
    msgtype: "m.text";
    body: string;
}> | null, "matrix/setMessageToEdit">, addPreviewMedia: import("@reduxjs/toolkit").ActionCreatorWithPayload<InputMedia[], "matrix/addPreviewMedia">, matchAndHidePreviewMedia: import("@reduxjs/toolkit").ActionCreatorWithPayload<MatrixEvent<{
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
} | {
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
}>[], "matrix/matchAndHidePreviewMedia">, matchAndRemovePreviewMedia: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
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
} | {
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
}, "matrix/matchAndRemovePreviewMedia">;
/*** Async thunk actions ***/
export declare const startMatrixClient: import("@reduxjs/toolkit").AsyncThunk<MatrixAuth, {
    fedimint: FedimintBridge;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const setMatrixDisplayName: import("@reduxjs/toolkit").AsyncThunk<void, {
    displayName: string;
}, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const uploadAndSetMatrixAvatarUrl: import("@reduxjs/toolkit").AsyncThunk<string, {
    fedimint: FedimintBridge;
    path: string;
    mimeType: string;
}, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const joinMatrixRoom: import("@reduxjs/toolkit").AsyncThunk<void, {
    roomId: MatrixRoom["id"];
    isPublic?: boolean;
}, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const createMatrixRoom: import("@reduxjs/toolkit").AsyncThunk<{
    roomId: MatrixRoom["id"];
}, {
    name: MatrixRoom["name"];
    broadcastOnly?: boolean;
    isPublic?: boolean;
}, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const leaveMatrixRoom: import("@reduxjs/toolkit").AsyncThunk<void, {
    roomId: MatrixRoom["id"];
}, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const observeMatrixRoom: import("@reduxjs/toolkit").AsyncThunk<void, {
    roomId: MatrixRoom["id"];
}, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const unobserveMatrixRoom: import("@reduxjs/toolkit").AsyncThunk<void, {
    roomId: MatrixRoom["id"];
}, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const inviteUserToMatrixRoom: import("@reduxjs/toolkit").AsyncThunk<void, {
    roomId: MatrixRoom["id"];
    userId: MatrixUser["id"];
}, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const setMatrixRoomName: import("@reduxjs/toolkit").AsyncThunk<void, {
    roomId: MatrixRoom["id"];
    name: MatrixRoom["name"];
}, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const setMatrixRoomBroadcastOnly: import("@reduxjs/toolkit").AsyncThunk<MatrixRoomPowerLevels, {
    roomId: MatrixRoom["id"];
    broadcastOnly: boolean;
}, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const setMatrixRoomMemberPowerLevel: import("@reduxjs/toolkit").AsyncThunk<MatrixRoomPowerLevels, {
    roomId: MatrixRoom["id"];
    userId: MatrixUser["id"];
    powerLevel: MatrixPowerLevel;
}, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const sendMatrixMessage: import("@reduxjs/toolkit").AsyncThunk<void, {
    fedimint: FedimintBridge;
    roomId: MatrixRoom["id"];
    body: string;
    options?: {
        interceptBolt11: boolean;
    };
}, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const sendMatrixDirectMessage: import("@reduxjs/toolkit").AsyncThunk<{
    roomId: string;
}, {
    userId: MatrixUser["id"];
    body: string;
}, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const sendMatrixPaymentPush: import("@reduxjs/toolkit").AsyncThunk<void, {
    fedimint: FedimintBridge;
    federationId: string;
    roomId: MatrixRoom["id"];
    recipientId: MatrixUser["id"];
    amount: Sats;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const sendMatrixPaymentRequest: import("@reduxjs/toolkit").AsyncThunk<void, {
    fedimint: FedimintBridge;
    federationId: string;
    roomId: MatrixRoom["id"];
    amount: Sats;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const claimMatrixPayment: import("@reduxjs/toolkit").AsyncThunk<void, {
    fedimint: FedimintBridge;
    event: MatrixPaymentEvent;
}, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const checkForReceivablePayments: import("@reduxjs/toolkit").AsyncThunk<void, {
    fedimint: FedimintBridge;
    roomId?: MatrixRoom["id"];
    receivedPayments: Set<string>;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const cancelMatrixPayment: import("@reduxjs/toolkit").AsyncThunk<void, {
    fedimint: FedimintBridge;
    event: MatrixPaymentEvent;
}, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const acceptMatrixPaymentRequest: import("@reduxjs/toolkit").AsyncThunk<void, {
    fedimint: FedimintBridge;
    event: MatrixPaymentEvent;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const rejectMatrixPaymentRequest: import("@reduxjs/toolkit").AsyncThunk<void, {
    event: MatrixPaymentEvent;
}, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const searchMatrixUsers: import("@reduxjs/toolkit").AsyncThunk<MatrixSearchResults, string, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const fetchMatrixProfile: import("@reduxjs/toolkit").AsyncThunk<any, string, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const getMatrixRoomPreview: import("@reduxjs/toolkit").AsyncThunk<MatrixGroupPreview, string, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const refetchMatrixRoomMembers: import("@reduxjs/toolkit").AsyncThunk<void, string, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const refetchMatrixRoomList: import("@reduxjs/toolkit").AsyncThunk<void, void, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const paginateMatrixRoomTimeline: import("@reduxjs/toolkit").AsyncThunk<{
    end: boolean;
}, {
    roomId: MatrixRoom["id"];
    limit?: number;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const sendMatrixReadReceipt: import("@reduxjs/toolkit").AsyncThunk<void, {
    roomId: MatrixRoom["id"];
    eventId: MatrixEvent["id"];
}, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const configureMatrixPushNotifications: import("@reduxjs/toolkit").AsyncThunk<string, {
    getToken: () => Promise<string>;
    appId: string;
    appName: string;
}, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const updateMatrixRoomNotificationMode: import("@reduxjs/toolkit").AsyncThunk<RpcRoomNotificationMode, {
    roomId: MatrixRoom["id"];
    mode: RpcRoomNotificationMode;
}, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const ignoreUser: import("@reduxjs/toolkit").AsyncThunk<void, {
    userId: MatrixUser["id"];
}, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const unignoreUser: import("@reduxjs/toolkit").AsyncThunk<void, {
    userId: MatrixUser["id"];
}, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const kickUser: import("@reduxjs/toolkit").AsyncThunk<void, {
    roomId: MatrixRoom["id"];
    userId: MatrixRoomMember["id"];
    reason?: string;
}, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const banUser: import("@reduxjs/toolkit").AsyncThunk<void, {
    roomId: MatrixRoom["id"];
    userId: MatrixRoomMember["id"];
    reason?: string;
}, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const unbanUser: import("@reduxjs/toolkit").AsyncThunk<void, {
    roomId: MatrixRoom["id"];
    userId: MatrixRoomMember["id"];
    reason?: string;
}, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const previewGlobalDefaultChats: import("@reduxjs/toolkit").AsyncThunk<MatrixGroupPreview[], void, {
    state: CommonState;
    dispatch?: import("redux").Dispatch | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const previewCommunityDefaultChats: import("@reduxjs/toolkit").AsyncThunk<MatrixGroupPreview[], string, {
    state: CommonState;
    dispatch?: import("redux").Dispatch | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
/**
 * Fetches the room previews for any default chats configured in the meta
 * of any federations that have been loaded
 */
export declare const previewAllDefaultChats: import("@reduxjs/toolkit").AsyncThunk<MatrixGroupPreview[], void, {
    state: CommonState;
    dispatch?: import("redux").Dispatch | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const observeMatrixSyncStatus: import("@reduxjs/toolkit").AsyncThunk<void, void, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const unsubscribeMatrixSyncStatus: import("@reduxjs/toolkit").AsyncThunk<void, void, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
/*** Selectors ***/
export declare const selectMatrixStatus: (s: CommonState) => MatrixSyncStatus;
export declare const selectIsMatrixReady: ((state: CommonState) => boolean) & import("reselect").OutputSelectorFields<(args_0: MatrixSyncStatus) => boolean, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectMatrixPushNotificationToken: (s: CommonState) => string | null;
/**
 * Returns a list of matrix rooms, excluding any that are loading or missing room information.
 * TODO: Alternate selector that includes loading rooms, or refactor all to handle loading rooms?
 */
export declare const selectMatrixRooms: ((state: CommonState) => MatrixRoom[]) & import("reselect").OutputSelectorFields<(args_0: MatrixRoomListItem[], args_1: Record<string, MatrixRoom | undefined>, args_2: Record<string, MatrixRoomPowerLevels | undefined>) => MatrixRoom[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectGroupPreviews: ((state: CommonState) => Record<string, MatrixGroupPreview>) & import("reselect").OutputSelectorFields<(args_0: Record<string, MatrixGroupPreview>) => Record<string, MatrixGroupPreview>, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectMatrixAuth: ((state: CommonState) => {
    displayName: string;
    userId: string;
    deviceId: string;
    avatarUrl?: string;
} | null) & import("reselect").OutputSelectorFields<(args_0: MatrixAuth | null) => {
    displayName: string;
    userId: string;
    deviceId: string;
    avatarUrl?: string;
} | null, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectHasSetMatrixDisplayName: ((state: CommonState) => boolean) & import("reselect").OutputSelectorFields<(args_0: MatrixAuth | null) => boolean, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectMatrixDisplayNameSuffix: ((state: CommonState) => string) & import("reselect").OutputSelectorFields<(args_0: MatrixAuth | null) => string, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectNeedsMatrixRegistration: ((state: CommonState) => boolean) & import("reselect").OutputSelectorFields<(args_0: MatrixAuth | null, args_1: boolean) => boolean, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectMatrixUsers: (s: CommonState) => Record<string, MatrixUser | undefined>;
export declare const selectMatrixUser: (s: CommonState, userId: MatrixUser["id"]) => MatrixUser | undefined;
export declare const selectMatrixChatsList: ((state: CommonState) => MatrixRoom[]) & import("reselect").OutputSelectorFields<(args_0: MatrixRoom[], args_1: Record<string, MatrixGroupPreview>) => MatrixRoom[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectIsMatrixChatEmpty: (s: CommonState) => boolean;
export declare const selectMatrixRoom: (s: CommonState, roomId: MatrixRoom["id"]) => MatrixRoom | undefined;
export declare const selectGroupPreview: ((state: CommonState, roomId: string) => MatrixGroupPreview) & import("reselect").OutputSelectorFields<(args_0: Record<string, MatrixGroupPreview>, args_1: string) => MatrixGroupPreview, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectMatrixRoomPowerLevels: (s: CommonState, roomId: MatrixRoom["id"]) => MatrixRoomPowerLevels | undefined;
export declare const selectMatrixRoomNotificationMode: (s: CommonState, roomId: MatrixRoom["id"]) => RpcRoomNotificationMode | undefined;
export declare const selectMatrixRoomMembers: (s: CommonState, roomId: MatrixRoom["id"]) => MatrixRoomMember[];
export declare const selectActiveMatrixRoomMembers: ((state: CommonState, roomId: string) => MatrixRoomMember[]) & import("reselect").OutputSelectorFields<(args_0: MatrixRoomMember[]) => MatrixRoomMember[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/**
 * Get the list of members in a room.
 * Make the first member the current user.
 * Leave the rest of the list as is.
 */
export declare const selectMatrixRoomMembersByMe: ((state: CommonState, roomId: string) => MatrixRoomMember[]) & import("reselect").OutputSelectorFields<(args_0: MatrixRoomMember[], args_1: {
    displayName: string;
    userId: string;
    deviceId: string;
    avatarUrl?: string;
} | null) => MatrixRoomMember[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/**
 * Returns count of active room members.
 * Doesn't include members who left or
 * have been invited but have not joined.
 */
export declare const selectMatrixRoomMembersCount: (s: CommonState, roomId: MatrixRoom["id"]) => number;
export declare const selectMatrixRoomMemberMap: ((state: CommonState, roomId: string) => Record<string, MatrixRoomMember | undefined>) & import("reselect").OutputSelectorFields<(args_0: MatrixRoomMember[]) => Record<string, MatrixRoomMember | undefined>, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectMatrixRoomMember: ((state: CommonState, _roomId: string, userId: string) => MatrixRoomMember | undefined) & import("reselect").OutputSelectorFields<(args_0: MatrixRoomMember[], args_1: string) => MatrixRoomMember | undefined, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectMatrixRoomEventsHaveLoaded: (s: CommonState, roomId: MatrixRoom["id"]) => boolean;
export declare const selectMatrixRoomEvents: ((state: CommonState, roomId: string) => MatrixEvent<import("../types").MatrixEventContent>[]) & import("reselect").OutputSelectorFields<(args_0: Record<string, MatrixTimelineItem[] | undefined>, args_1: string) => MatrixEvent<import("../types").MatrixEventContent>[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectMatrixRoomLatestPaymentEvent: ((state: CommonState, _roomId: string, paymentId: string) => MatrixPaymentEvent | undefined) & import("reselect").OutputSelectorFields<(args_0: MatrixEvent<import("../types").MatrixEventContent>[], args_1: string) => MatrixPaymentEvent | undefined, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectMatrixRoomSelfPowerLevel: ((state: CommonState, roomId: string) => number) & import("reselect").OutputSelectorFields<(args_0: MatrixRoomMember[], args_1: {
    displayName: string;
    userId: string;
    deviceId: string;
    avatarUrl?: string;
} | null) => number, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectMatrixRoomIsReadOnly: ((state: CommonState, roomId: string) => boolean) & import("reselect").OutputSelectorFields<(args_0: MatrixRoomPowerLevels | undefined, args_1: number) => boolean, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectMatrixDirectMessageRoom: ((state: CommonState, userId: string) => MatrixRoom | undefined) & import("reselect").OutputSelectorFields<(args_0: string, args_1: MatrixRoom[]) => MatrixRoom | undefined, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectMatrixHasNotifications: ((state: CommonState) => boolean) & import("reselect").OutputSelectorFields<(args_0: MatrixRoom[]) => boolean, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/**
 * Returns users who we have DM'd with most recently. Optionally
 * takes in an argument of the number to return, defaults to 4.
 */
export declare const selectRecentMatrixRoomMembers: ((state: CommonState, limit?: number | undefined) => MatrixRoomMember[]) & import("reselect").OutputSelectorFields<(args_0: MatrixRoom[], args_1: Record<string, MatrixRoomMember[] | undefined>, args_2: number) => MatrixRoomMember[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectLatestMatrixRoomEventId: (s: CommonState, roomId: MatrixRoom["id"]) => MatrixEvent["eventId"] | undefined;
export declare const selectCanPayFromOtherFeds: ((state: CommonState, chatPayment: MatrixPaymentEvent) => boolean) & import("reselect").OutputSelectorFields<(args_0: import("../types").LoadedFederation[], args_1: MatrixPaymentEvent) => boolean, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectCanSendPayment: ((state: CommonState, chatPayment: MatrixPaymentEvent) => boolean) & import("reselect").OutputSelectorFields<(args_0: import("../types").LoadedFederation[], args_1: MatrixPaymentEvent) => boolean, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectCanClaimPayment: ((state: CommonState, chatPayment: MatrixPaymentEvent) => boolean) & import("reselect").OutputSelectorFields<(args_0: import("../types").LoadedFederation[], args_1: MatrixPaymentEvent) => boolean, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectCommunityDefaultRoomIds: ((state: CommonState, federationId: string) => string[]) & import("reselect").OutputSelectorFields<(args_0: import("../types").LoadedFederation | undefined) => string[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectDefaultMatrixRoomIds: ((state: CommonState) => string[]) & import("reselect").OutputSelectorFields<(args_0: import("../types").LoadedFederation[], args_1: {
    [x: string]: string | undefined;
} | undefined) => string[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectChatDrafts: (s: CommonState) => Record<string, string>;
export declare const selectSelectedChatMessage: (s: CommonState) => MatrixEvent<{
    msgtype: "m.text";
    body: string;
} | {
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
} | {
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
} | {
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
}> | null;
export declare const selectMessageToEdit: (s: CommonState) => MatrixEvent<{
    msgtype: "m.text";
    body: string;
}> | null;
export declare const selectMatrixStarted: (s: CommonState) => boolean;
export declare const selectPreviewMedia: (s: CommonState) => {
    visible: boolean;
    media: InputMedia;
}[];
export declare const selectPreviewMediaMatchingEventContent: (s: CommonState, content: MatrixEventContentType<"m.video" | "m.image">) => {
    visible: boolean;
    media: InputMedia;
} | undefined;
export {};
