import { MutableRefObject } from 'react'
import type { WebView, WebViewMessageEvent } from 'react-native-webview'

import {
    AnyInjectionRequestMessage,
    InjectionMessageType,
    InjectionMessageHandlers,
    InjectionMessageHandler,
} from './types'

export * from './types'

const messageTypes = Object.values(InjectionMessageType)

/**
 * Generates some JavaScript that can be injected into a webview. Allows you
 * to configure which APIs are injected. By default, no APIs are injected
 * unless specified.
 */
export function generateInjectionJs(config: {
    webln?: boolean
    eruda?: boolean
}) {
    const injections: string[] = []

    if (config.webln) {
        injections.push(process.env.INJECTION_WEBLN as string)
    }

    if (config.eruda) {
        injections.push(process.env.INJECTION_ERUDA as string)
    }

    return injections.join('\n')
}

/**
 * Generates a callback intended to be passed to a react-native-webview
 * `<WebView />`'s `onMessage` prop. Takes in a `useRef` of the webview,
 * and a map of message handlers keyed by `InjectionMessageType`.
 */
export function makeWebViewMessageHandler(
    webviewRef: MutableRefObject<WebView>,
    handlers: InjectionMessageHandlers,
) {
    return async (event: WebViewMessageEvent) => {
        const webview = webviewRef.current
        if (!webview) {
            throw new Error(
                '@fedi/injections: webview ref is not set, cannot handle message',
            )
        }

        // Parse the message from the event, ignore messages that aren't for us
        let message: AnyInjectionRequestMessage | undefined
        try {
            message = JSON.parse(event.nativeEvent.data)
        } catch {
            /* no-op */
        }
        if (!message || !messageTypes.includes(message.type)) {
            return
        }

        const { id, type } = message
        try {
            // Have to do a little casting since TS can't infer that the
            // handler matches the message.
            const handler = handlers[type] as InjectionMessageHandler<
                typeof type
            >
            const response = await handler(
                message as Parameters<typeof handler>[0],
            )
            webview.postMessage(JSON.stringify({ id, type, data: response }))
        } catch (err) {
            const errorMessage =
                err && typeof err === 'object'
                    ? 'message' in err
                        ? err.message
                        : String(err)
                    : 'Unexpected error'
            webview.postMessage(
                JSON.stringify({
                    id,
                    type,
                    error: {
                        message: errorMessage,
                    },
                }),
            )
        }
    }
}
