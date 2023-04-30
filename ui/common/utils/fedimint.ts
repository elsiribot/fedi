import type {
    Transaction,
    Federation,
    Invoice,
    AddressOrInvoice,
    ValidateEcashResponse,
    LnurlSignedMessage,
    XmppCredentials,
    RecoveredUsername,
    SeedWords,
    MSats,
    Sats,
    LightningGateway,
    SocialRecoveryEvent,
    SocialRecoveryQrCode,
    FedimintBridgeEventMap,
} from '../types'

export class FedimintBridge {
    constructor(
        private readonly rpc: <T = void>(
            method: string,
            payload: object,
        ) => Promise<T>,
    ) {}

    /*** RPC METHODS ***/

    async listTransactions(federationId: string) {
        return this.rpc<Transaction[]>('listTransactions', { federationId })
    }

    async updateTransactionNotes(
        transactionId: string,
        notes: string,
        federationId: string,
    ) {
        return this.rpc('updateTransactionNotes', {
            federationId,
            transactionId,
            notes,
        })
    }

    async joinFederation(connectString: string) {
        return this.rpc<Federation>('joinFederation', { connectString })
    }

    async leaveFederation(federationId: string) {
        return this.rpc('leaveFederation', { federationId })
    }

    async listFederations() {
        return this.rpc<Federation[]>('listFederations', {})
    }

    async generateInvoice(
        amount: MSats,
        description: string,
        federationId: string,
    ) {
        return this.rpc<string>('generateInvoice', {
            amount,
            description,
            federationId,
        })
    }

    async decodeInvoice(invoice: string) {
        return this.rpc<Invoice>('decodeInvoice', { invoice })
    }

    async addressOrInvoice(input: string, federationId: string) {
        return this.rpc<AddressOrInvoice>('addressOrInvoice', {
            federationId,
            input,
        })
    }

    async payInvoice(invoice: string, federationId: string) {
        return this.rpc('payInvoice', { invoice, federationId })
    }

    async generateAddress(federationId: string) {
        return this.rpc<string>('generateAddress', { federationId })
    }

    async payAddress(address: string, sats: Sats, federationId: string) {
        return this.rpc<string>('payAddress', {
            address,
            sats,
            federationId,
        })
    }

    async generateEcash(amount: number, federationId: string) {
        return this.rpc<string>('generateEcash', { federationId, amount })
    }

    async receiveEcash(ecash: string, federationId: string) {
        return this.rpc<MSats>('receiveEcash', {
            federationId,
            ecash,
        })
    }

    async validateEcash(ecash: string, federationId: string) {
        return this.rpc<ValidateEcashResponse>('validateEcash', {
            federationId,
            ecash,
        })
    }

    async lnurlSignMessage(message: string, federationId: string) {
        return this.rpc<LnurlSignedMessage>('lnurlSignMessage', {
            message,
            federationId,
        })
    }

    async getXmppCredentials(federationId: string) {
        return this.rpc<XmppCredentials>('xmppCredentials', { federationId })
    }

    async backupXmppUsername(username: String, federationId: string) {
        return this.rpc('backupXmppUsername', { username, federationId })
    }

    async listGateways(federationId: string) {
        return this.rpc<LightningGateway[]>('listGateways', { federationId })
    }

    async switchGateway(gateway: LightningGateway, federationId: string) {
        // FIXME: annoying how nodePubkey has 2 different forms of casing ...
        return this.rpc('switchGateway', {
            federationId,
            nodePubkey: gateway.nodePubKey,
        })
    }

    async getMnemonic(federationId: string) {
        return this.rpc<SeedWords>('getMnemonic', { federationId })
    }

    async recoverFromMnemonic(mnemonic: string[], federationId: string) {
        return this.rpc<RecoveredUsername>('recoverFromMnemonic', {
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
        return this.rpc('uploadBackupFile', { federationId, videoFilePath })
    }

    async locateRecoveryFile(federationId: string) {
        return this.rpc<string>('locateRecoveryFile', { federationId })
    }

    async validateRecoveryFile(path: string, federationId: string) {
        console.log('backup file path', path)
        return this.rpc<boolean>('validateRecoveryFile', { federationId, path })
    }

    async recoveryQr(federationId: string) {
        return this.rpc<SocialRecoveryQrCode>('recoveryQr', { federationId })
    }

    async socialRecoveryApprovals(federationId: string) {
        return this.rpc<SocialRecoveryEvent>('socialRecoveryApprovals', {
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
        return this.rpc('approveSocialRecoveryRequest', {
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
        return this.rpc<string | null>(
            'socialRecoveryDownloadVerificationDoc',
            {
                federationId,
                recoveryId,
            },
        )
    }

    async completeSocialRecovery(federationId: string) {
        return this.rpc<RecoveredUsername>('completeSocialRecovery', {
            federationId,
        })
    }

    /*** BRIDGE EVENTS ***/

    private listeners = new Map<string, Array<(data: any) => void>>()

    emit(eventType: string, data: any) {
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
    addListener(eventType: string, listener: (data: any) => void): () => void {
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
