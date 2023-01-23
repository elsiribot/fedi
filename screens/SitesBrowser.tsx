import { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import React, { MutableRefObject, useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { injectJs, onMessageHandler } from 'react-native-webln'
import { WebView } from 'react-native-webview'
import { KeysendArgs, RequestInvoiceArgs } from 'webln'

import { useTranslation } from 'react-i18next'
import { decodeInvoice } from '../bridge'
import CustomOverlay from '../components/ui/CustomOverlay'
import { useBridge } from '../state/hooks'
import { Sats } from '../types'
import type { RootStackParamList } from '../types/navigation'
import amountUtils from '../utils/AmountUtils'

export type Props = BottomTabScreenProps<RootStackParamList, 'SitesBrowser'>

const SitesBrowser: React.FC<Props> = ({ route }) => {
    const { site } = route.params
    const { generateInvoice, payInvoice } = useBridge()
    const { t } = useTranslation()
    // FIXME: is this type casting acceptable?
    const webview = useRef<WebView>() as MutableRefObject<WebView>
    const [jsInjected, setJsInjected] = useState(false)
    const [jwt, setJwt] = useState<string | null>(null)
    const [showOverlay, setShowOverlay] = useState(false)
    const [overlay, setOverlay] = useState({
        title: '',
        message: '',
        buttons: [{}],
    })
    const { lnurlGetToken } = useBridge()

    useEffect(() => {
        if (Object.keys(overlay.title).length !== 0) {
            setShowOverlay(true)
        }
    }, [overlay])

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
            let amount: Sats
            let description = ''
            if (typeof data === 'string') {
                amount = Number.parseInt(data, 10) as Sats
            } else if (typeof data === 'number') {
                amount = data as Sats
            } else {
                if (typeof data.amount === 'string') {
                    amount = Number.parseInt(data.amount, 10) as Sats
                } else if (typeof data.amount === 'number') {
                    amount = data.amount as Sats
                } else {
                    amount = 0 as Sats
                }
                description = data.defaultMemo || ''
            }

            try {
                await new Promise((resolve, reject) => {
                    setOverlay({
                        title: `${site.title} wants to pay you`,
                        message: `${amount} ${t('words.sats').toUpperCase()}`,
                        buttons: [
                            {
                                text: 'Reject',
                                type: 'outline',
                                onPress: () => {
                                    reject()
                                    setShowOverlay(false)
                                },
                            },
                            {
                                text: 'Accept',
                                type: 'solid',
                                onPress: () => {
                                    resolve(null)
                                    setShowOverlay(false)
                                },
                            },
                        ],
                    })
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
            const amountSats = amountUtils.msatToSat(invoice.amount)

            try {
                // Wait for user to interact with alert
                await new Promise((resolve, reject) => {
                    setOverlay({
                        title: `Boost this post on ${site.title}?`,
                        message: `${amountSats} ${t(
                            'words.sats',
                        ).toUpperCase()}?`,
                        buttons: [
                            {
                                text: 'Reject',
                                type: 'outline',
                                onPress: () => {
                                    reject('Denied')
                                    setShowOverlay(false)
                                },
                            },
                            {
                                text: 'Accept',
                                type: 'solid',
                                onPress: () => {
                                    resolve('Accepted')
                                    setShowOverlay(false)
                                },
                            },
                        ],
                    })
                })

                // Attempt to pay the invoice
                // TODO: Check selectedFederation.balance < invoice.amount
                // and run a toast.show
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
            if (paymentRequest.toLowerCase().startsWith('lnurl')) {
                setOverlay({
                    title: 'Login',
                    message: `Login to ${site.title}?`,
                    buttons: [
                        {
                            text: 'No',
                            type: 'outline',
                            onPress: () => {
                                console.error('Login denied')
                                setShowOverlay(false)
                            },
                        },
                        {
                            text: 'Yes',
                            type: 'solid',
                            onPress: async () => {
                                try {
                                    const token = await lnurlGetToken(
                                        paymentRequest,
                                    )
                                    setJwt(token)
                                    console.log(
                                        'FIXLN-URL auth successful',
                                        token,
                                    )
                                } catch (e) {
                                    // FIXME
                                    console.error('LNURL-Auth failed', e)
                                }
                                setShowOverlay(false)
                            },
                        },
                    ],
                })
            }
        },
    })

    // FIXME: properly url-encode this
    const uri = jwt ? `${site.url}?token=${jwt}` : site.url
    console.log('uri: ', uri)
    return (
        <View style={styles.container}>
            {/* TODO: Move SitesHeader here so we can pass props to it */}
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
            {showOverlay && (
                <CustomOverlay
                    show={showOverlay}
                    setShow={setShowOverlay}
                    title={overlay.title}
                    message={overlay.message}
                    buttons={overlay.buttons}
                />
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // justifyContent: 'space-evenly',
        // alignItems: 'center',
    },
})

export default SitesBrowser
