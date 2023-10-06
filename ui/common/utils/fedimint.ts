import type {
    Federation,
    FedimintBridgeEventMap,
    MSats,
    Sats,
    Transaction,
    bindings,
} from '../types'

export class FedimintBridge {
    constructor(
        private readonly rpc: <T = void>(
            method: string,
            payload: object,
        ) => Promise<T>,
    ) {}

    async rpcTyped<M extends bindings.RpcMethodNames, R extends bindings.RpcResponse<M>>(method: M, payload: bindings.RpcPayload<M>): Promise<R> {
        return await this.rpc(method, payload);
    }

    /*** RPC METHODS ***/

    async listTransactions(federationId: string) {
        return this.rpcTyped<'listTransactions', Transaction[]>('listTransactions', { federationId })
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
        return this.rpcTyped<'listFederations', Federation[]>('listFederations', {})
    }

    async generateInvoice(
        amount: MSats,
        description: string,
        federationId: string,
    ) {
        return this.rpcTyped('generateInvoice', {
            amount,
            description,
            federationId,
        })
    }

    async decodeInvoice(invoice: string) {
        return this.rpcTyped('decodeInvoice', { invoice })
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

    async signLnurlMessage(message: string, federationId: string) {
        return this.rpcTyped('signLnurlMessage', {
            message,
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

    async switchGateway(gatewayId: bindings.RpcPublicKey, federationId: string) {
        return this.rpcTyped('switchGateway', {
            federationId,
            gatewayId,
        })
    }

    async getMnemonic(federationId: string) {
        return this.rpcTyped('getMnemonic', { federationId })
    }

    async recoverFromMnemonic(mnemonic: string[], federationId: string) {
        return this.rpcTyped('recoverFromMnemonic', {
            mnemonic,
            federationId,
        })
    }

    /*
     * Mocked-out social backup and recovery methods
     */

    async uploadBackupFile(videoFilePath: string, federationId: string) {
        // FIXME: for some reason rust can't read the file if it has `file://` prefix ...
        videoFilePath = videoFilePath.replace('file://', '')
        return this.rpcTyped('uploadBackupFile', { federationId, videoFilePath })
    }

    async locateRecoveryFile(federationId: string) {
        return this.rpcTyped('locateRecoveryFile', { federationId })
    }

    async validateRecoveryFile(path: string, federationId: string) {
        console.debug('backup file path', path)
        return this.rpcTyped('validateRecoveryFile', { federationId, path })
    }

    async recoveryQr(federationId: string) {
        return this.rpcTyped('recoveryQr', { federationId })
    }

    async socialRecoveryApprovals(federationId: string) {
        return this.rpcTyped('socialRecoveryApprovals', {
            federationId,
        })
    }

    // guardian fetches `_secret` (somehow) from federation admin web UI
    async authenticateGuardian(
        _secret: string,
        _federationId: string,
    ): Promise<null> {
        // Simulate success/failure modes
        return Promise.resolve(null)
        // return Promise.reject('invalid secret')
    }

    // `_userPublicKey` is what guardian decryption shares are threshold-encrypted to
    async denySocialRecoveryRequest(
        _userPublicKey: string,
        _federationId: string,
    ): Promise<null> {
        // Simulate success/failure modes
        return Promise.resolve(null)
        // return Promise.reject('social recovery denial failed')
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
        return this.rpcTyped(
            'socialRecoveryDownloadVerificationDoc',
            {
                federationId,
                recoveryId,
            },
        )
    }

    async completeSocialRecovery(federationId: string) {
        return this.rpcTyped('completeSocialRecovery', {
            federationId,
        })
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
