import {
    InjectionMessageType,
    InjectionMessageResponseMap,
    EcashRequest,
} from '../types'
import { sendInjectorMessage } from '../utils'

interface FediInternalProvider {
    generateEcash(amountMsat: EcashRequest): Promise<string>
    receiveEcash(ecash: string): Promise<string>
    getUsername(): Promise<string>
    getActiveFederationId(): Promise<string>
}

class InjectionFediProvider implements FediInternalProvider {
    private lastMessageId = 0

    async generateEcash(ecashRequest: EcashRequest): Promise<string> {
        return this.sendMessage(
            InjectionMessageType.fedi_generateEcash,
            ecashRequest,
        )
    }

    async receiveEcash(ecash: string): Promise<string> {
        return this.sendMessage(InjectionMessageType.fedi_receiveEcash, ecash)
    }

    async getUsername(): Promise<string> {
        return this.sendMessage(
            InjectionMessageType.fedi_getUsername,
            undefined,
        )
    }

    async getActiveFederationId(): Promise<string> {
        return this.sendMessage(
            InjectionMessageType.fedi_getActiveFederationId,
            undefined,
        )
    }

    /** Sends a message to the injector via postMessage, returns response */
    private async sendMessage<K extends keyof InjectionMessageResponseMap>(
        type: K,
        message: InjectionMessageResponseMap[K]['message'],
    ): Promise<InjectionMessageResponseMap[K]['response']> {
        const id = this.lastMessageId++
        const response = await sendInjectorMessage({ id, type, data: message })
        return response as InjectionMessageResponseMap[K]['response']
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(window as any)['fediInternal'] = new InjectionFediProvider()

// Removed during compilation
export default ''
