import type {
    Federation,
    FedimintBridgeEventMap,
    MSats,
    Sats,
    Transaction,
    bindings,
} from '../types'
import {
    GuardianStatus,
    RpcAmount,
    RpcStabilityPoolAccountInfo,
} from '../types/bindings'
import { makeLog } from './log'

const log = makeLog('common/utils/fedimint')

export class FedimintBridge {
    constructor(
        private readonly rpc: <T = void>(
            method: string,
            payload: object,
        ) => Promise<T>,
    ) {}

    async rpcTyped<
        M extends bindings.RpcMethodNames,
        R extends bindings.RpcResponse<M>,
    >(method: M, payload: bindings.RpcPayload<M>): Promise<R> {
        return await this.rpc(method, payload)
    }

    /*** RPC METHODS ***/

    async federationPreview(inviteCode: string) {
        return this.rpcTyped('federationPreview', { inviteCode })
    }

    async stabilityPoolWithdraw(
        lockedBps: number,
        unlockedAmount: RpcAmount,
        federationId: string,
    ) {
        return this.rpcTyped<'stabilityPoolWithdraw', string>(
            'stabilityPoolWithdraw',
            { lockedBps, unlockedAmount, federationId },
        )
    }

    async stabilityPoolDepositToSeek(amount: RpcAmount, federationId: string) {
        return this.rpcTyped<'stabilityPoolDepositToSeek', string>(
            'stabilityPoolDepositToSeek',
            { amount, federationId },
        )
    }

    async stabilityPoolAccountInfo(federationId: string, forceUpdate = true) {
        return this.rpcTyped<
            'stabilityPoolAccountInfo',
            RpcStabilityPoolAccountInfo
        >('stabilityPoolAccountInfo', { federationId, forceUpdate })
    }

    async stabilityPoolCycleStartPrice(federationId: string) {
        return this.rpcTyped('stabilityPoolCycleStartPrice', { federationId })
    }

    async stabilityPoolNextCycleStartTime(federationId: string) {
        return this.rpcTyped('stabilityPoolNextCycleStartTime', {
            federationId,
        })
    }

    async listTransactions(
        federationId: string,
        startTime?: number,
        limit?: number,
    ) {
        return this.rpcTyped<'listTransactions', Transaction[]>(
            'listTransactions',
            {
                federationId,
                startTime: startTime || null,
                limit: limit || null,
            },
        )
    }

    async guardianStatus(federationId: string) {
        return this.rpcTyped<'guardianStatus', GuardianStatus[]>(
            'guardianStatus',
            { federationId },
        )
    }

    async updateTransactionNotes(
        transactionId: string,
        notes: string,
        federationId: string,
    ) {
        return this.rpcTyped('updateTransactionNotes', {
            federationId,
            transactionId,
            notes,
        })
    }

    async joinFederation(inviteCode: string) {
        return this.rpcTyped('joinFederation', { inviteCode })
    }

    async leaveFederation(federationId: string) {
        return this.rpcTyped('leaveFederation', { federationId })
    }

    async listFederations() {
        return this.rpcTyped<'listFederations', Federation[]>(
            'listFederations',
            {},
        )
    }

    async generateInvoice(
        amount: MSats,
        description: string,
        federationId: string,
        expiry: number | null = null,
    ) {
        return this.rpcTyped('generateInvoice', {
            amount,
            description,
            federationId,
            expiry,
        })
    }

    async decodeInvoice(invoice: string) {
        return this.rpcTyped('decodeInvoice', { invoice, federationId: null })
    }

    async payInvoice(invoice: string, federationId: string) {
        return this.rpcTyped('payInvoice', {
            invoice,
            federationId,
        })
    }

    async generateAddress(federationId: string) {
        return this.rpcTyped('generateAddress', { federationId })
    }

    async payAddress(address: string, sats: Sats, federationId: string) {
        // FIXME: sats must be bigint
        return this.rpc<string>('payAddress', {
            address,
            sats,
            federationId,
        })
    }

    async generateEcash(amount: MSats, federationId: string) {
        return this.rpcTyped('generateEcash', { federationId, amount })
    }

    async receiveEcash(ecash: string, federationId: string) {
        return this.rpcTyped('receiveEcash', {
            federationId,
            ecash,
        })
    }

    async validateEcash(ecash: string) {
        return this.rpcTyped('validateEcash', {
            ecash,
        })
    }

    async cancelEcash(ecash: string, federationId: string) {
        return this.rpcTyped('cancelEcash', {
            ecash,
            federationId,
        })
    }

    async signLnurlMessage(
        message: string,
        domain: string,
        federationId: string,
    ) {
        return this.rpcTyped('signLnurlMessage', {
            message,
            domain,
            federationId,
        })
    }

    async getNostrPubKey(federationId: string) {
        return this.rpcTyped('getNostrPubKey', { federationId })
    }

    async signNostrEvent(eventHash: string, federationId: string) {
        return this.rpcTyped('signNostrEvent', {
            eventHash,
            federationId,
        })
    }

    async getXmppCredentials(federationId: string) {
        return this.rpcTyped('xmppCredentials', { federationId })
    }

    async backupXmppUsername(username: string, federationId: string) {
        return this.rpcTyped('backupXmppUsername', { username, federationId })
    }

    async listGateways(federationId: string) {
        return this.rpcTyped('listGateways', { federationId })
    }

    async switchGateway(
        gatewayId: bindings.RpcPublicKey,
        federationId: string,
    ) {
        return this.rpcTyped('switchGateway', {
            federationId,
            gatewayId,
        })
    }

    async getMnemonic() {
        return this.rpcTyped('getMnemonic', {})
    }

    async recoverFromMnemonic(mnemonic: string[]) {
        return this.rpcTyped('recoverFromMnemonic', {
            mnemonic,
        })
    }

    /*
     * Mocked-out social backup and recovery methods
     */

    async uploadBackupFile(videoFilePath: string, federationId: string) {
        // FIXME: for some reason rust can't read the file if it has `file://` prefix ...
        videoFilePath = videoFilePath.replace('file://', '')
        return this.rpcTyped('uploadBackupFile', {
            federationId,
            videoFilePath,
        })
    }

    async locateRecoveryFile() {
        return this.rpcTyped('locateRecoveryFile', {})
    }

    async validateRecoveryFile(path: string) {
        log.debug('backup file path', path)
        await this.rpcTyped('validateRecoveryFile', { path })
    }

    async recoveryQr() {
        return this.rpcTyped('recoveryQr', {})
    }

    async socialRecoveryApprovals() {
        return this.rpcTyped('socialRecoveryApprovals', {})
    }

    async getSensitiveLog() {
        return this.rpcTyped('getSensitiveLog', {})
    }

    async setSensitiveLog(enable: boolean) {
        return this.rpcTyped('setSensitiveLog', { enable })
    }

    // `_userPublicKey` is what guardian decryption shares are threshold-encrypted to
    async approveSocialRecoveryRequest(
        recoveryId: string,
        peerId: number,
        password: string,
        federationId: string,
    ) {
        return this.rpcTyped('approveSocialRecoveryRequest', {
            recoveryId,
            peerId,
            password,
            federationId,
        })
    }

    async socialRecoveryDownloadVerificationDoc(
        recoveryId: string,
        federationId: string,
    ) {
        return this.rpcTyped('socialRecoveryDownloadVerificationDoc', {
            federationId,
            recoveryId,
        })
    }

    async completeSocialRecovery() {
        return this.rpcTyped('completeSocialRecovery', {})
    }

    async cancelSocialRecovery() {
        return this.rpcTyped('cancelSocialRecovery', {})
    }

    /*** BRIDGE EVENTS ***/

    private listeners = new Map<string, Array<(data: unknown) => void>>()

    emit(eventType: string, data: unknown) {
        const listeners = this.listeners.get(eventType) || []
        listeners.forEach(listener => listener(data))
    }

    /**
     * Subscribe to bridge events. Returns an unsubscribe function.
     */
    addListener<K extends keyof FedimintBridgeEventMap>(
        eventType: K,
        listener: (data: FedimintBridgeEventMap[K]) => void,
    ): () => void
    addListener(
        eventType: string,
        listener: (data: unknown) => void,
    ): () => void {
        const listeners = this.listeners.get(eventType) || []
        this.listeners.set(eventType, [...listeners, listener])

        // Return a quick unsubscribe function
        return () => {
            const subscribedListeners = this.listeners.get(eventType) || []
            this.listeners.set(
                eventType,
                subscribedListeners.filter(l => l !== listener),
            )
        }
    }
}
