import {
    InjectionMessageType,
    InjectionRequestMessage,
    InjectionResponseError,
    InjectionResponseMessage,
} from './types'

export async function sendInjectorMessage<T extends InjectionMessageType>(
    message: InjectionRequestMessage<T>,
): Promise<InjectionResponseMessage<T>['data']> {
    // Send the message
    let postMessage = window.postMessage
    if ('ReactNativeWebView' in window) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        postMessage = (window.ReactNativeWebView as any).postMessage
    }
    postMessage(JSON.stringify(message))

    // Setup a listener for the response
    return new Promise((resolve, reject) => {
        const messageHandler = (ev: MessageEvent) => {
            let data: InjectionResponseMessage<T> | InjectionResponseError
            // Parse JSON, ignore errors (not for us)
            try {
                data = JSON.parse(ev.data)
            } catch {
                return
            }
            // Make sure it matches the type & id of our message
            if (data.id !== message.id || data.type !== message.type) {
                return
            }
            // Resolve data, reject errors
            if ('error' in data) {
                reject(new Error(data.error.message))
            } else {
                resolve(data.data)
            }
            window.removeEventListener('message', messageHandler)
        }
        window.addEventListener('message', messageHandler)
    })
}
