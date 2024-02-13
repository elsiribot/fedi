import { InjectionMessageType, InjectionMessageResponseMap } from '../types'
import { sendInjectorMessage } from '../utils'

interface FediInternalProvider {
    requestEcash(amountMsat: number): Promise<string>;
    redeemEcash(ecash: string): Promise<string>;
}

class InjectionFediProvider implements FediInternalProvider {
    private lastMessageId = 0;

    async requestEcash(amountMsat: number): Promise<string> {
        return this.sendMessage(InjectionMessageType.fedi_generateEcash, amountMsat);
    }

    async redeemEcash(ecash: string): Promise<string> {
        return this.sendMessage(InjectionMessageType.fedi_receiveEcash, ecash);
    }

    /** Sends a message to the injector via postMessage, returns response */
    private async sendMessage<K extends keyof InjectionMessageResponseMap>(
        type: K,
        message: InjectionMessageResponseMap[K]['message']
    ): Promise<InjectionMessageResponseMap[K]['response']> {
        const id = this.lastMessageId++;
        const response = await sendInjectorMessage({ id, type, data: message });
        return response as InjectionMessageResponseMap[K]['response'];
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(window as any)['fedi-internal'] = new InjectionFediProvider();

// Removed during compilation
export default ''
