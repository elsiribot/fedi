import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import React, { MutableRefObject, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { WebView } from 'react-native-webview'
import { injectJs, onMessageHandler } from 'react-native-webln'

import { RequestInvoiceArgs, KeysendArgs } from 'webln'
import type { RootStackParamList } from '../types/navigation'

export type Props = BottomTabScreenProps<RootStackParamList, 'Webview'>

const Webview: React.FC<Props> = ({ route }) => {
    const { url } = route.params
    // FIXME: is this type casting acceptable?
    const webview = useRef<WebView>() as MutableRefObject<WebView>
    const [jsInjected, setJsInjected] = useState(false)

    const onMessage = onMessageHandler(webview, {
        enable: async () => {
            console.log('enable')
        },
        getInfo: async () => {
            console.log('getinfo')
            const node = { alias: 'fixme', pubkey: 'fixme' }
            return { node }
        },
        makeInvoice: async (args: string | number | RequestInvoiceArgs) => {
            console.log('makeinvoice', args)
            return { paymentRequest: 'fixme' }
        },
        sendPayment: async (paymentRequest: string) => {
            console.log('sendPayment', paymentRequest)
            return { preimage: 'fixme' }
        },
        signMessage: async (message: string) => {
            console.log('signMessage', message)
            return { message, signature: 'fixme' }
        },
        verifyMessage: async (signature: string, message: string) => {
            console.log('verifyMessage', signature, message)
        },
        keysend: async (args: KeysendArgs) => {
            console.log('keysend', args)
            return { preimage: 'fixme' }
        },

        // Non-WebLN
        // Called when an a-tag containing a `lightning:` uri is found on a page
        foundInvoice: async (paymentRequest: string) => {
            console.log('foundInvoice', paymentRequest)
        },
    })
    return (
        <View style={styles.container}>
            <WebView
                ref={webview}
                source={{ uri: url }}
                onLoadStart={() => setJsInjected(false)}
                onLoadProgress={e => {
                    if (!jsInjected && e.nativeEvent.progress > 0.75) {
                        webview.current.injectJavaScript(injectJs())
                        setJsInjected(true)
                    }
                }}
                onMessage={onMessage}
                style={{ width: '100%', height: '100%', flex: 1 }}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // justifyContent: 'space-evenly',
        // alignItems: 'center',
        paddingHorizontal: 24,
    },
})

export default Webview
