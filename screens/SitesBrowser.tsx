import React, { MutableRefObject, useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { injectJs, onMessageHandler } from 'react-native-webln'
import { WebView } from 'react-native-webview'
import { KeysendArgs, RequestInvoiceArgs } from 'webln'

import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useTranslation } from 'react-i18next'
import { decodeInvoice } from '../bridge'
import SitesHeader from '../components/feature/sites/SitesHeader'
import CustomOverlay, {
    CustomOverlayContents,
} from '../components/ui/CustomOverlay'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useFederationsContext } from '../state/contexts/FederationsContext'
import { useBridge } from '../state/hooks'
import { MSats, Sats } from '../types'
import type { SitesStackParamList } from '../types/navigation'
import amountUtils from '../utils/AmountUtils'

export type Props = NativeStackScreenProps<SitesStackParamList, 'SitesBrowser'>

const SitesBrowser: React.FC<Props> = ({ route }) => {
    const { site } = route.params
    const { generateInvoice, payInvoice } = useBridge()
    const { t } = useTranslation()
    const { selectedFederation } = useFederationsContext().state
    const { toast } = useEnvironmentContext().state
    const webview = useRef<WebView>() as MutableRefObject<WebView>
    const [jsInjected, setJsInjected] = useState<boolean>(false)
    const [jwt, setJwt] = useState<string | null>(null)
    const [showOverlay, setShowOverlay] = useState<boolean>(false)
    const [overlayContents, setOverlayContents] =
        useState<CustomOverlayContents>({
            title: '',
            message: '',
            buttons: [],
        })
    const { lnurlGetToken } = useBridge()

    useEffect(() => {
        if (overlayContents !== null) {
            setShowOverlay(true)
        }
    }, [overlayContents])

    // Reset overlay content when hidden
    useEffect(() => {
        if (showOverlay === false) {
            setOverlayContents({
                title: '',
                message: '',
                buttons: [],
            })
        }
    }, [showOverlay])

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
                    setOverlayContents({
                        title: t('feature.sites.wants-to-pay-you', {
                            site: site.title,
                        }),
                        message: `${amount} ${t('words.sats').toUpperCase()}`,
                        buttons: [
                            {
                                text: t('words.reject'),
                                textColor: 'black',
                                backgroundColor: 'white',
                                onPress: () => {
                                    reject(false)
                                    setShowOverlay(false)
                                },
                            },
                            {
                                text: t('words.accept'),
                                onPress: async () => {
                                    resolve(true)
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
                    setOverlayContents({
                        title: t('feature.sites.payment-request', {
                            site: site.title,
                        }),
                        message: `${amountSats} ${t(
                            'words.sats',
                        ).toUpperCase()}`,
                        buttons: [
                            {
                                text: t('words.reject'),
                                textColor: 'black',
                                backgroundColor: 'white',
                                onPress: () => {
                                    reject(false)
                                    setShowOverlay(false)
                                },
                            },
                            {
                                text: t('words.accept'),
                                onPress: async () => {
                                    resolve(true)
                                    setShowOverlay(false)
                                },
                            },
                        ],
                    })
                })

                // Attempt to pay the invoice
                if (selectedFederation!.balance < invoice.amount) {
                    toast?.show(
                        t('errors.insufficient-balance', {
                            balance: `${amountUtils.msatToSat(
                                selectedFederation?.balance as MSats,
                            )} SATS`,
                        }),
                        5000,
                    )
                } else {
                    await payInvoice(paymentRequest)
                }

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
                setOverlayContents({
                    title: t('feature.sites.login-to'),
                    message: `${site.title}`,
                    buttons: [
                        {
                            text: t('words.no'),
                            textColor: 'black',
                            backgroundColor: 'white',
                            onPress: () => {
                                console.error('Login denied')
                                setShowOverlay(false)
                            },
                        },
                        {
                            text: t('words.yes'),
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
            <SitesHeader webViewRef={webview} />
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
            <CustomOverlay
                show={showOverlay}
                onBackdropPress={() => setShowOverlay(false)}
                contents={overlayContents}
            />
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
