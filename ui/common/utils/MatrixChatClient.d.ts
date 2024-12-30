import { MatrixAuth, MatrixCreateRoomOptions, MatrixError, MatrixRoom, MatrixRoomListObservableUpdates, MatrixRoomMember, MatrixRoomPowerLevels, MatrixSearchResults, MatrixSyncStatus, MatrixTimelineItem, MatrixTimelineObservableUpdates, MatrixUser } from '../types';
import { JSONObject, RpcRoomNotificationMode } from '../types/bindings';
import { FedimintBridge } from './fedimint';
import { MatrixEventContent } from './matrix';
export declare enum UserPowerLevel {
    User = 0,
    Moderator = 50,
    Admin = 100
}
interface MatrixChatClientEventMap {
    status: MatrixSyncStatus;
    roomListUpdate: MatrixRoomListObservableUpdates;
    roomInfo: MatrixRoom;
    roomMember: MatrixRoomMember;
    roomMembers: {
        roomId: MatrixRoom['id'];
        members: MatrixRoomMember[];
    };
    roomTimelineUpdate: {
        roomId: string;
        updates: MatrixTimelineObservableUpdates;
    };
    roomPowerLevels: {
        roomId: MatrixRoom['id'];
        powerLevels: MatrixRoomPowerLevels;
    };
    roomNotificationMode: {
        roomId: MatrixRoom['id'];
        mode: RpcRoomNotificationMode;
    };
    user: MatrixUser;
    error: MatrixError;
    auth: MatrixAuth;
}
export declare class MatrixChatClient {
    hasStarted: boolean;
    private emitter;
    private fedimint;
    private startPromise;
    private roomInfoUnsubscribeMap;
    private roomTimelineUnsubscribeMap;
    private roomListUnsubscribe;
    private syncStatusUnsubscribe;
    private displayNameValidator;
    /*** Public methods ***/
    start(fedimint: FedimintBridge): Promise<MatrixAuth>;
    getInitialAuth(): Promise<MatrixAuth>;
    refetchAuth(): Promise<void>;
    private getAccountSession;
    getRoomPreview: (roomId: string) => Promise<{
        info: MatrixRoom;
        timeline: MatrixTimelineItem[];
    }>;
    joinRoom(roomId: string, isPublic?: boolean): Promise<void>;
    createRoom(options?: MatrixCreateRoomOptions): Promise<{
        roomId: string;
    }>;
    leaveRoom(roomId: string): Promise<void>;
    observeRoom(roomId: string): void;
    unobserveRoom(roomId: string): void;
    setRoomTopic(roomId: string, topic: string): Promise<void>;
    setRoomName(roomId: string, name: string): Promise<void>;
    setRoomPowerLevels(roomId: string, powerLevels: MatrixRoomPowerLevels): Promise<{
        ban?: number;
        invite?: number;
        kick?: number;
        redact?: number;
        state_default?: number;
        events_default?: number;
        events?: Record<string, number>;
        users?: Record<string, number>;
    }>;
    inviteUserToRoom(roomId: string, userId: string): Promise<void>;
    setRoomNotificationMode(roomId: string, mode: RpcRoomNotificationMode): Promise<void>;
    setRoomMemberPowerLevel(roomId: string, userId: string, powerLevel: number): Promise<{
        users: Record<string, number>;
    }>;
    sendMessage(roomId: string, content: MatrixEventContent): Promise<void>;
    /**
     * Special wrapper around `sendMessage`, takes in a user ID instead of a
     * room ID, and creates a direct message room if one doesn't exist.
     */
    sendDirectMessage(userId: string, content: MatrixEventContent): Promise<{
        roomId: string;
    }>;
    userDirectorySearch(searchTerm: string): Promise<MatrixSearchResults>;
    fetchMatrixProfile(userId: MatrixUser['id']): Promise<JSONObject>;
    setDisplayName(displayName: string): Promise<void>;
    setAvatarUrl(avatarUrl: string): Promise<void>;
    roomPaginateTimeline(roomId: string, eventNum: number): Promise<{
        end: boolean;
    }>;
    sendReadReceipt(roomId: string, eventId: string): Promise<boolean>;
    markRoomAsUnread(roomId: string, unread: boolean): Promise<null>;
    refetchRoomMembers(roomId: string): Promise<void>;
    refetchRoomList(): Promise<void>;
    unsubscribeSyncStatus(): Promise<void>;
    configureNotificationsPusher(token: string, appId: string, appName: string): Promise<null>;
    ignoreUser(userId: string): Promise<null>;
    unignoreUser(userId: string): Promise<null>;
    roomKickUser(roomId: string, userId: string, reason?: string): Promise<void>;
    roomBanUser(roomId: string, userId: string, reason?: string): Promise<void>;
    roomUnbanUser(roomId: string, userId: string, reason?: string): Promise<void>;
    emit<TEventName extends keyof MatrixChatClientEventMap>(eventName: TEventName, argument: MatrixChatClientEventMap[TEventName]): void;
    on<TEventName extends keyof MatrixChatClientEventMap>(eventName: TEventName, handler: (argument: MatrixChatClientEventMap[TEventName]) => void): void;
    off<TEventName extends keyof MatrixChatClientEventMap>(eventName: TEventName, handler: (argument: MatrixChatClientEventMap[TEventName]) => void): void;
    removeAllListeners(event?: keyof MatrixChatClientEventMap): void;
    observeSyncStatus(): void;
    /*** Private methods ***/
    private observeRoomList;
    private observeRoomInfo;
    private observeRoomTimeline;
    private observeRoomMembers;
    private observeRoomPowerLevels;
    private observeRoomNotificationMode;
    private serializeRoomListItem;
    private serializePublicRoomInfo;
    private serializeRoomInfo;
    private serializeRoomMember;
    private serializeAuth;
    private serializeUserDirectorySearchResponse;
    private serializeTimelineItem;
    private ensureDisplayName;
}
export {};
