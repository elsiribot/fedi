import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { MutableRefObject, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { injectJs, onMessageHandler } from 'react-native-webln'
import { WebView } from 'react-native-webview'
import { KeysendArgs, RequestInvoiceArgs } from 'webln'

import { selectActiveFederation } from '@fedi/common/redux'
import amountUtils from '@fedi/common/utils/AmountUtils'

import { fedimint } from '../bridge'
import SitesBrowserHeader from '../components/feature/sites/SitesBrowserHeader'
import CustomOverlay, {
    CustomOverlayContents,
} from '../components/ui/CustomOverlay'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppSelector, useBridge, useBtcFiatPrice } from '../state/hooks'
import { MSats, Sats } from '../types'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'SitesBrowser'>

const SitesBrowser: React.FC<Props> = ({ route }) => {
    const { site } = route.params
    const { generateInvoice, payInvoice } = useBridge()
    const { t } = useTranslation()
    const activeFederation = useAppSelector(selectActiveFederation)
    const { toast } = useEnvironmentContext().state
    const { convertSatsToFormattedFiat } = useBtcFiatPrice()
    const webview = useRef<WebView>() as MutableRefObject<WebView>
    const [jsInjected, setJsInjected] = useState<boolean>(false)
    const [jwt, setJwt] = useState<string | null>(null)
    const [showOverlay, setShowOverlay] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const [overlayContents, setOverlayContents] =
        useState<CustomOverlayContents>({
            title: '',
            message: '',
            description: '',
            buttons: [],
        })
    const { lnurlGetToken } = useBridge()

    useEffect(() => {
        if (overlayContents.title) {
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
                } else if (typeof data.maximumAmount === 'string') {
                    amount = Number.parseInt(data.maximumAmount, 10) as Sats
                } else if (typeof data.maximumAmount === 'number') {
                    amount = data.maximumAmount as Sats
                } else {
                    amount = 0 as Sats
                }
                description = data.defaultMemo || ''
            }

            return new Promise((resolve, reject) => {
                setOverlayContents({
                    title: t('feature.sites.wants-to-pay-you', {
                        site: site.title,
                    }),
                    message: `${amountUtils.formatNumber(amount)} ${t(
                        'words.sats',
                    ).toUpperCase()}`,
                    description: `${convertSatsToFormattedFiat(amount)}`,
                    buttons: [
                        {
                            text: t('words.reject'),
                            onPress: () => {
                                reject()
                                setShowOverlay(false)
                            },
                        },
                        {
                            primary: true,
                            text: t('words.accept'),
                            onPress: async () => {
                                try {
                                    console.log('generate', amount)
                                    const invoice = await generateInvoice(
                                        amountUtils.satToMsat(amount),
                                        description,
                                    )
                                    console.log('invoice', invoice)
                                    resolve({
                                        paymentRequest: invoice,
                                    })
                                } catch (error) {
                                    toast?.show((error as Error).message, 3000)
                                    reject()
                                }
                                setShowOverlay(false)
                            },
                        },
                    ],
                })
            })

            //     // FIXME: Check webln spec to see what we should return here
            // } catch (error) {
            //     toast?.show((error as Error).message, 3000)
            //     throw error
            // }
        },
        sendPayment: async (paymentRequest: string) => {
            var invoice
            try {
                invoice = await fedimint.decodeInvoice(paymentRequest)
            } catch (error) {
                toast?.show(t('phrases.failed-to-decode-invoice'), 3000)
                throw Error(t('phrases.failed-to-decode-invoice'))
            }
            const amountSats = amountUtils.msatToSat(invoice.amount)

            if (activeFederation!.balance < invoice.amount) {
                const message = t('errors.insufficient-balance', {
                    balance: `${amountUtils.msatToSat(
                        activeFederation?.balance as MSats,
                    )} SATS`,
                })
                toast?.show(message, 5000)
                throw Error(message)
            }

            // Wait for user to interact with alert
            return new Promise((resolve, reject) => {
                setOverlayContents({
                    title: t('feature.sites.payment-request', {
                        site: site.title,
                    }),
                    message: `${amountUtils.formatNumber(amountSats)} ${t(
                        'words.sats',
                    ).toUpperCase()}`,
                    description: `${convertSatsToFormattedFiat(amountSats)}`,
                    buttons: [
                        {
                            text: t('words.reject'),
                            onPress: () => {
                                setShowOverlay(false)
                                reject()
                            },
                        },
                        {
                            primary: true,
                            text: t('words.accept'),
                            onPress: async () => {
                                try {
                                    setLoading(true)
                                    await payInvoice(paymentRequest)
                                    setShowOverlay(false)
                                    // resolve(true)
                                    setLoading(false)
                                    resolve({
                                        preimage: 'fixme',
                                    })
                                } catch (error) {
                                    setLoading(false)
                                    console.log('pay failed', error)
                                    toast?.show((error as Error).message, 3000)
                                    reject()
                                }
                            },
                        },
                    ],
                })
            })
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
                            onPress: () => {
                                console.error('Login denied')
                                setShowOverlay(false)
                            },
                        },
                        {
                            primary: true,
                            text: t('words.yes'),
                            onPress: async () => {
                                try {
                                    setLoading(true)
                                    const token = await lnurlGetToken(
                                        paymentRequest,
                                    )
                                    setLoading(false)
                                    setJwt(token)
                                    console.log(
                                        'FIXLN-URL auth successful',
                                        token,
                                    )
                                } catch (e) {
                                    setLoading(false)
                                    toast?.show(
                                        t('feature.sites.login-failed'),
                                        3000,
                                    )
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
    let uri = jwt ? `${site.url}?token=${jwt}` : site.url
    // TODO: Remove me after alpha, just to get webln working on faucet.
    if (uri.includes('https://faucet.mutinynet.dev.fedibtc.com')) {
        uri = `${uri}${uri.includes('?') ? '&' : '?'}webln=1`
    }
    console.log('uri: ', uri)

    return (
        <View style={styles.container}>
            <SitesBrowserHeader webViewRef={webview} />
            <WebView
                ref={webview}
                source={{ uri }}
                onLoadStart={() => setJsInjected(false)}
                onLoadProgress={e => {
                    if (!jsInjected && e.nativeEvent.progress > 0.75) {
                        webview.current.injectJavaScript(injectJs())
                        setJsInjected(true)
                    }
                }}
                allowsInlineMediaPlayback
                onMessage={onMessage}
                style={{ width: '100%', height: '100%', flex: 1 }}
            />
            <CustomOverlay
                show={showOverlay}
                onBackdropPress={() => setShowOverlay(false)}
                contents={overlayContents}
                loading={loading}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
})

export default SitesBrowser
