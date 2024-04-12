import type { Federation, FedimintBridgeEventMap, MSats, Sats, bindings } from '../types';
import { RpcAmount } from '../types/bindings';
export declare class FedimintBridge {
    private readonly rpc;
    constructor(rpc: <T = void>(method: string, payload: object) => Promise<T>);
    rpcTyped<M extends bindings.RpcMethodNames, R extends bindings.RpcResponse<M>>(method: M, payload: bindings.RpcPayload<M>): Promise<R>;
    /*** RPC METHODS ***/
    federationPreview(inviteCode: string): Promise<{
        id: string;
        name: string;
        meta: Record<string, string>;
        inviteCode: string;
        version: number;
        returningMemberStatus: bindings.RpcReturningMemberStatus;
    }>;
    stabilityPoolWithdraw(lockedBps: number, unlockedAmount: RpcAmount, federationId: string): Promise<string>;
    stabilityPoolDepositToSeek(amount: RpcAmount, federationId: string): Promise<string>;
    stabilityPoolAccountInfo(federationId: string, forceUpdate?: boolean): Promise<bindings.RpcStabilityPoolAccountInfo>;
    stabilityPoolCycleStartPrice(federationId: string): Promise<bigint>;
    stabilityPoolNextCycleStartTime(federationId: string): Promise<bigint>;
    listTransactions(federationId: string, startTime?: number, limit?: number): Promise<bindings.RpcTransaction[]>;
    guardianStatus(federationId: string): Promise<bindings.GuardianStatus[]>;
    updateTransactionNotes(transactionId: string, notes: string, federationId: string): Promise<null>;
    joinFederation(inviteCode: string): Promise<{
        balance: MSats;
        id: string;
        network: string | null;
        name: string;
        inviteCode: string;
        meta: Record<string, string>;
        recovering: boolean;
        nodes: Record<string, {
            url: string;
            name: string;
        }>;
        version: number;
        clientConfig: bindings.RpcJsonClientConfig | null;
        fediFeeSchedule: bindings.RpcFediFeeSchedule;
    }>;
    leaveFederation(federationId: string): Promise<null>;
    listFederations(): Promise<Federation[]>;
    generateInvoice(amount: MSats, description: string, federationId: string, expiry?: number | null): Promise<string>;
    decodeInvoice(invoice: string, federationId?: string): Promise<{
        paymentHash: string;
        amount: MSats;
        fee: bindings.RpcFeeDetails | null;
        description: string;
        invoice: string;
    }>;
    payInvoice(invoice: string, federationId: string): Promise<{
        preimage: string;
    }>;
    generateAddress(federationId: string): Promise<string>;
    previewPayAddress(address: string, sats: Sats, federationId: string): Promise<bindings.RpcFeeDetails>;
    payAddress(address: string, sats: Sats, federationId: string): Promise<bindings.RpcPayAddressResponse>;
    generateEcash(amount: MSats, federationId: string): Promise<{
        ecash: string;
        cancelAt: number;
    }>;
    receiveEcash(ecash: string, federationId: string): Promise<MSats>;
    validateEcash(ecash: string): Promise<{
        amount: MSats;
        federationId: string | null;
    }>;
    cancelEcash(ecash: string, federationId: string): Promise<null>;
    signLnurlMessage(message: string, domain: string, federationId: string): Promise<{
        signature: string;
        pubkey: string;
    }>;
    getNostrPubKey(federationId: string): Promise<string>;
    signNostrEvent(eventHash: string, federationId: string): Promise<string>;
    getXmppCredentials(federationId: string): Promise<{
        password: string;
        keypairSeed: string;
        username: string | null;
    }>;
    backupXmppUsername(username: string, federationId: string): Promise<null>;
    listGateways(federationId: string): Promise<{
        nodePubKey: string;
        gatewayId: string;
        api: string;
        active: boolean;
    }[]>;
    switchGateway(gatewayId: bindings.RpcPublicKey, federationId: string): Promise<null>;
    getMnemonic(): Promise<string[]>;
    recoverFromMnemonic(mnemonic: string[]): Promise<{
        deviceIndex: number;
        deviceIdentifier: string;
        lastRegistrationTimestamp: number;
    }[]>;
    uploadBackupFile(videoFilePath: string, federationId: string): Promise<string>;
    locateRecoveryFile(): Promise<string>;
    validateRecoveryFile(path: string): Promise<void>;
    recoveryQr(): Promise<{
        recoveryId: string;
    } | null>;
    socialRecoveryApprovals(): Promise<{
        approvals: bindings.SocialRecoveryApproval[];
        remaining: number;
    }>;
    getSensitiveLog(): Promise<boolean>;
    setSensitiveLog(enable: boolean): Promise<null>;
    approveSocialRecoveryRequest(recoveryId: string, peerId: number, password: string, federationId: string): Promise<null>;
    socialRecoveryDownloadVerificationDoc(recoveryId: string, federationId: string): Promise<string | null>;
    completeSocialRecovery(): Promise<{
        deviceIndex: number;
        deviceIdentifier: string;
        lastRegistrationTimestamp: number;
    }[]>;
    cancelSocialRecovery(): Promise<null>;
    /*** MATRIX ***/
    matrixInit(args: bindings.RpcPayload<'matrixInit'>): Promise<{
        userId: string;
        deviceId: string;
        displayName: string | null;
        avatarUrl: string | null;
    }>;
    matrixGetAccountSession(): Promise<{
        userId: string;
        deviceId: string;
        displayName: string | null;
        avatarUrl: string | null;
    }>;
    matrixRoomList(): Promise<bindings.ObservableVec<bindings.RpcRoomListEntry>>;
    matrixRoomListUpdateRanges(args: bindings.RpcPayload<'matrixRoomListUpdateRanges'>): Promise<null>;
    matrixRoomListInvites(): Promise<bindings.ObservableVec<bindings.RpcRoomListEntry>>;
    matrixRoomTimelineItems(args: bindings.RpcPayload<'matrixRoomTimelineItems'>): Promise<bindings.ObservableVec<bindings.RpcTimelineItem>>;
    matrixRoomTimelineItemsPaginateBackwards(args: bindings.RpcPayload<'matrixRoomTimelineItemsPaginateBackwards'>): Promise<null>;
    matrixRoomObserveTimelineItemsPaginateBackwards(args: bindings.RpcPayload<'matrixRoomObserveTimelineItemsPaginateBackwards'>): Promise<bindings.Observable<bindings.RpcBackPaginationStatus>>;
    /** @deprecated */
    matrixSendMessage(args: bindings.RpcPayload<'matrixSendMessage'>): Promise<null>;
    matrixSendMessageJson(args: bindings.RpcPayload<'matrixSendMessageJson'>): Promise<null>;
    matrixRoomCreate(args: bindings.RpcPayload<'matrixRoomCreate'>): Promise<string>;
    matrixRoomCreateOrGetDm(args: bindings.RpcPayload<'matrixRoomCreateOrGetDm'>): Promise<string>;
    matrixRoomJoin(args: bindings.RpcPayload<'matrixRoomJoin'>): Promise<null>;
    matrixRoomJoinPublic(args: bindings.RpcPayload<'matrixRoomJoinPublic'>): Promise<null>;
    matrixRoomLeave(args: bindings.RpcPayload<'matrixRoomLeave'>): Promise<null>;
    matrixRoomObserveInfo(args: bindings.RpcPayload<'matrixRoomObserveInfo'>): Promise<bindings.Observable<any>>;
    matrixRoomInviteUserById(args: bindings.RpcPayload<'matrixRoomInviteUserById'>): Promise<null>;
    matrixRoomSetName(args: bindings.RpcPayload<'matrixRoomSetName'>): Promise<null>;
    matrixRoomSetTopic(args: bindings.RpcPayload<'matrixRoomSetTopic'>): Promise<null>;
    matrixRoomGetMembers(args: bindings.RpcPayload<'matrixRoomGetMembers'>): Promise<{
        userId: string;
        displayName: string | null;
        avatarUrl: string | null;
        powerLevel: number;
        membership: bindings.RpcMatrixMembership;
    }[]>;
    matrixRoomGetPowerLevels(args: bindings.RpcPayload<'matrixRoomGetPowerLevels'>): Promise<any>;
    matrixRoomSetPowerLevels(args: bindings.RpcPayload<'matrixRoomSetPowerLevels'>): Promise<null>;
    matrixUserDirectorySearch(args: bindings.RpcPayload<'matrixUserDirectorySearch'>): Promise<{
        results: bindings.RpcMatrixUserDirectorySearchUser[];
        limited: boolean;
    }>;
    matrixSetDisplayName(args: bindings.RpcPayload<'matrixSetDisplayName'>): Promise<null>;
    matrixSetAvatarUrl(args: bindings.RpcPayload<'matrixSetAvatarUrl'>): Promise<null>;
    matrixUploadMedia(args: bindings.RpcPayload<'matrixUploadMedia'>): Promise<{
        contentUri: string;
    }>;
    matrixObserveSyncIndicator(): Promise<bindings.Observable<bindings.RpcSyncIndicator>>;
    matrixRoomSendReceipt(args: bindings.RpcPayload<'matrixRoomSendReceipt'>): Promise<boolean>;
    matrixObserverCancel(args: bindings.RpcPayload<'matrixObserverCancel'>): Promise<null>;
    /*** BRIDGE EVENTS ***/
    private listeners;
    emit(eventType: string, data: unknown): void;
    /**
     * Subscribe to bridge events. Returns an unsubscribe function.
     */
    addListener<K extends keyof FedimintBridgeEventMap>(eventType: K, listener: (data: FedimintBridgeEventMap[K]) => void): () => void;
}
