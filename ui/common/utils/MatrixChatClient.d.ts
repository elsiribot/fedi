import { MatrixRoom, MatrixUser, MatrixError, MatrixRoomMember, MatrixSearchResults, MatrixAuth, MatrixCreateRoomOptions, MatrixTimelineObservableUpdates, MatrixRoomListObservableUpdates, MatrixRoomPowerLevels, MatrixSyncStatus } from '../types';
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
    user: MatrixUser;
    error: MatrixError;
}
export declare class MatrixChatClient {
    hasStarted: boolean;
    private emitter;
    private fedimint;
    private startPromise;
    private observers;
    private roomObserverMap;
    private roomInvites;
    private joinedInvites;
    /*** Public methods ***/
    start({ fedimint, homeServer, slidingSyncProxy, }: {
        fedimint: FedimintBridge;
        homeServer: string;
        slidingSyncProxy: string;
    }): Promise<MatrixAuth>;
    getAccountSession(): Promise<{
        userId: string;
        deviceId: string;
        displayName: string | null;
        avatarUrl: string | null;
    }>;
    joinRoom(roomId: string): Promise<void>;
    createRoom(options?: MatrixCreateRoomOptions): Promise<{
        roomId: string;
    }>;
    leaveRoom(roomId: string): Promise<void>;
    observeRoom(roomId: string): void;
    unobserveRoom(roomId: string): void;
    setRoomName(roomId: string, name: string): Promise<void>;
    setRoomPowerLevels(roomId: string, powerLevels: MatrixRoomPowerLevels): Promise<any>;
    inviteUserToRoom(roomId: string, userId: string): Promise<void>;
    setRoomMemberPowerLevel(roomId: string, userId: string, powerLevel: number): Promise<any>;
    sendMessage(roomId: string, content: MatrixEventContent): Promise<void>;
    /**
     * Special wrapper around `sendMessage`, takes in a user ID instead of a
     * room ID, and creates a direct message room if one doesn't exist.
     */
    sendDirectMessage(userId: string, content: MatrixEventContent): Promise<{
        roomId: string;
    }>;
    userDirectorySearch(searchTerm: string): Promise<MatrixSearchResults>;
    setDisplayName(displayName: string): Promise<void>;
    setAvatarUrl(avatarUrl: string): Promise<void>;
    roomPaginateTimeline(roomId: string, eventNum: number): Promise<{
        end: boolean;
    }>;
    sendReadReceipt(roomId: string, eventId: string): Promise<boolean>;
    emit<TEventName extends keyof MatrixChatClientEventMap>(eventName: TEventName, argument: MatrixChatClientEventMap[TEventName]): void;
    on<TEventName extends keyof MatrixChatClientEventMap>(eventName: TEventName, handler: (argument: MatrixChatClientEventMap[TEventName]) => void): void;
    off<TEventName extends keyof MatrixChatClientEventMap>(eventName: TEventName, handler: (argument: MatrixChatClientEventMap[TEventName]) => void): void;
    removeAllListeners(event?: keyof MatrixChatClientEventMap): void;
    /*** Private methods ***/
    private observe;
    private unobserve;
    private handleObservableUpdate;
    private observeSyncStatus;
    private observeRoomList;
    private observeRoomInfo;
    private observeRoomTimeline;
    private observeRoomMembers;
    private observeRoomPowerLevels;
    private autoJoinInvites;
    private serializeRoomListItem;
    private serializeRoomInfo;
    private serializeRoomMember;
    private serializeAuth;
    private serializeUserDirectorySearchResponse;
    private serializeTimelineItem;
}
export {};
