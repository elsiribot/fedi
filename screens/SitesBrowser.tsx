import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import React, { MutableRefObject, useRef, useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'
import { WebView } from 'react-native-webview'
import { injectJs, onMessageHandler } from 'react-native-webln'

import { RequestInvoiceArgs, KeysendArgs } from 'webln'
import type { RootStackParamList } from '../types/navigation'
import { useBridge } from '../contexts/FederationsContext'
import amountUtils from '../utils/AmountUtils'
import { decodeInvoice } from '../bridge'

export type Props = BottomTabScreenProps<RootStackParamList, 'SitesBrowser'>

const SitesBrowser: React.FC<Props> = ({ route }) => {
    const { site } = route.params
    const { generateInvoice, payInvoice } = useBridge()
    // FIXME: is this type casting acceptable?
    const webview = useRef<WebView>() as MutableRefObject<WebView>
    const [jsInjected, setJsInjected] = useState(false)
    const [jwt, setJwt] = useState<string | null>(null)
    const { lnurlGetToken } = useBridge()

    const onMessage = onMessageHandler(webview, {
        enable: async () => {
            console.log('enable')
        },
        getInfo: async () => {
            console.log('getinfo')
            const node = { alias: 'fixme', pubkey: 'fixme' }
            return { node }
        },
        makeInvoice: async (data: string | number | RequestInvoiceArgs) => {
            console.log('makeinvoice', data)
            // FIXME: copied from blixt
            let amount: number
            let description = ''
            if (typeof data === 'string') {
                amount = Number.parseInt(data, 10)
            } else if (typeof data === 'number') {
                amount = data
            } else {
                if (typeof data.amount === 'string') {
                    amount = Number.parseInt(data.amount, 10)
                } else if (typeof data.amount === 'number') {
                    amount = data.amount
                } else {
                    amount = 0
                }
                description = data.defaultMemo || ''
            }

            try {
                await new Promise((resolve, reject) => {
                    Alert.alert(
                        'Invoice request',
                        `Website wants to pay you ${amount} sats. Do you want to accept that?`,
                        [
                            {
                                text: 'Yes',
                                style: 'default',
                                onPress: () => resolve(null),
                            },
                            {
                                text: 'No',
                                style: 'default',
                                onPress: () => reject(),
                            },
                        ],
                    )
                })

                const invoice = await generateInvoice(
                    amountUtils.satToMsat(amount),
                    description,
                )

                return {
                    paymentRequest: invoice,
                }
            } catch (e) {
                console.error('Error creating invoice', e)
                throw new Error('Denied')
            }
        },
        sendPayment: async (paymentRequest: string) => {
            const invoice = await decodeInvoice(paymentRequest)
            const amountSats = amountUtils.millisToSats(invoice.amount)

            try {
                // Wait for user to interact with alert
                await new Promise((resolve, reject) => {
                    Alert.alert(
                        'Payment request',
                        `Pay website ${amountSats} sats?`,
                        [
                            {
                                text: 'Yes',
                                style: 'default',
                                onPress: () => resolve('Accepted'),
                            },
                            {
                                text: 'No',
                                style: 'default',
                                onPress: () => reject('Denied'),
                            },
                        ],
                    )
                })

                // Attempt to pay the invoice
                await payInvoice(paymentRequest)

                return {
                    preimage: 'fixme',
                }
            } catch (e) {
                console.error('sendPayment failed', e)
                throw e
            }
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
            if (paymentRequest.startsWith('LNURL')) {
                Alert.alert('Login', `Login to ${site.title}?`, [
                    {
                        text: 'Yes',
                        style: 'default',
                        onPress: async () => {
                            try {
                                const token = await lnurlGetToken(
                                    paymentRequest,
                                )
                                setJwt(token)
                                console.log('FIXLN-URL auth successful', token)
                            } catch (e) {
                                // FIXME
                                console.error('LNURL-Auth failed', e)
                            }
                        },
                    },
                    {
                        text: 'No',
                        style: 'default',
                        onPress: () => console.error('Login denied'),
                    },
                ])
            }
        },
    })

    // FIXME: properly url-encode this
    const uri = jwt ? `${site.url}?token=${jwt}` : site.url
    console.log('uri: ', uri)
    return (
        <View style={styles.container}>
            <WebView
                ref={webview}
                source={{ uri: site.url }}
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

export default SitesBrowser
