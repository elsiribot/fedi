import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { MutableRefObject, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'
import { injectJs, onMessageHandler } from 'react-native-webln'
import { WebView } from 'react-native-webview'
import {
    RequestInvoiceArgs,
    RequestInvoiceResponse,
    UnsupportedMethodError,
    SendPaymentResponse,
} from 'webln'

import {
    selectActiveFederation,
    selectAuthenticatedMember,
    selectFediModDebugMode,
} from '@fedi/common/redux'
import {
    Invoice,
    MSats,
    ParsedLnurlAuth,
    ParserDataType,
} from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'
import { parseUserInput } from '@fedi/common/utils/parser'

import { fedimint } from '../bridge'
import FediModBrowserHeader from '../components/feature/fedimods/FediModBrowserHeader'
import { AuthOverlay } from '../components/feature/webview/AuthOverlay'
import { MakeInvoiceOverlay } from '../components/feature/webview/MakeInvoiceOverlay'
import { SendPaymentOverlay } from '../components/feature/webview/SendPaymentOverlay'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppSelector, useBridge } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'FediModBrowser'>

type FediModResponse = RequestInvoiceResponse | SendPaymentResponse
type FediModResolver<T> = (value: T | PromiseLike<T>) => void

const INJECTABLE_ERUDA_DEBUG_WIDGET = `(function () {
    var script = document.createElement('script');
    script.src="https://cdn.jsdelivr.net/npm/eruda";
    document.body.append(script);
    script.onload = function () { eruda.init(); }
})();`

const FediModBrowser: React.FC<Props> = ({ route }) => {
    const { fediMod } = route.params
    const { listGateways } = useBridge()
    const insets = useSafeAreaInsets()
    const { t } = useTranslation()
    const activeFederation = useAppSelector(selectActiveFederation)
    const authenticatedMember = useAppSelector(selectAuthenticatedMember)
    const fediModDebugMode = useAppSelector(selectFediModDebugMode)
    const { toast } = useEnvironmentContext().state
    const webview = useRef<WebView>() as MutableRefObject<WebView>
    const [jsInjected, setJsInjected] = useState<boolean>(false)
    const [jwt] = useState<string | null>(null)
    const overlayResolveRef = useRef<
        FediModResolver<FediModResponse> | undefined
    >() as MutableRefObject<FediModResolver<FediModResponse> | undefined>
    const overlayRejectRef = useRef<(reason: Error) => void>()

    const [requestInvoiceArgs, setRequestInvoiceArgs] =
        useState<RequestInvoiceArgs | null>(null)
    const [invoiceToPay, setInvoiceToPay] = useState<Invoice | null>(null)
    const [lnurlAuthRequest, setLnurlAuthRequest] = useState<
        ParsedLnurlAuth['data'] | null
    >(null)

    // Handle all messages coming from a WebLN-enabled site
    const onMessage = onMessageHandler(webview, {
        enable: async () => {
            /* no-op */
            console.info('webln enabled')
        },
        getInfo: () => {
            return new Promise(async (resolve, reject) => {
                const alias = authenticatedMember?.username || ''
                let pubkey = ''
                try {
                    const gateways = await listGateways()
                    const gateway = gateways.find(g => g.active) || gateways[0]
                    if (gateway) {
                        pubkey = gateway.nodePubKey
                    }
                    resolve({ node: { alias, pubkey } })
                } catch (err) {
                    console.warn(
                        'Failed to list gateways for webln getInfo',
                        err,
                    )
                    reject(t('errors.no-lightning-gateways'))
                }
            })
        },
        makeInvoice: async (data: string | number | RequestInvoiceArgs) => {
            // Wait for user to interact with alert
            return new Promise((resolve, reject) => {
                // Save these refs to we can resolve / reject elsewhere
                overlayRejectRef.current = reject
                overlayResolveRef.current =
                    resolve as FediModResolver<FediModResponse>

                // TODO: Consider removing this since seeing a string or number
                // is not strictly WebLN-compliant but inferring an amount might
                // be convenient
                if (typeof data === 'string' || typeof data === 'number') {
                    setRequestInvoiceArgs({ amount: data })
                } else {
                    // Handle WebLN-compliant payload
                    setRequestInvoiceArgs(data as RequestInvoiceArgs)
                }
            })
        },
        sendPayment: async (data: string) => {
            console.info('webln:sendPayment', data)
            let invoice: Invoice
            try {
                invoice = await fedimint.decodeInvoice(data)
            } catch (error) {
                console.error('sendPayment', 'error', error)
                toast?.show(t('phrases.failed-to-decode-invoice'), 3000)
                throw Error(t('phrases.failed-to-decode-invoice'))
            }
            // Wait for user to interact with alert
            return new Promise((resolve, reject) => {
                // TODO: Hoist this to respect balance changes
                if (activeFederation!.balance < invoice.amount) {
                    const message = t('errors.insufficient-balance', {
                        balance: `${amountUtils.msatToSat(
                            activeFederation?.balance as MSats,
                        )} SATS`,
                    })
                    toast?.show(message, 5000)
                    reject(new Error(message))
                } else {
                    // Save these refs to we can resolve / reject elsewhere
                    overlayRejectRef.current = reject
                    overlayResolveRef.current =
                        resolve as FediModResolver<FediModResponse>
                    setInvoiceToPay(invoice)
                }
            })
        },
        signMessage: async () => {
            throw new UnsupportedMethodError(
                t('errors.webln-method-not-supported', {
                    method: 'signMessage',
                }),
            )
        },
        verifyMessage: async () => {
            throw new UnsupportedMethodError(
                t('errors.webln-method-not-supported', {
                    method: 'verifyMessage',
                }),
            )
        },
        keysend: async () => {
            throw new UnsupportedMethodError(
                t('errors.webln-method-not-supported', { method: 'keysend' }),
            )
        },

        // Non-WebLN
        // Called when an a-tag containing a `lightning:` uri is found on a page
        foundInvoice: async (data: string) => {
            try {
                const parsedData = await parseUserInput(data, fedimint, t)
                if (parsedData.type === ParserDataType.LnurlAuth) {
                    setLnurlAuthRequest(parsedData.data)
                }
            } catch (err) {
                console.warn(
                    'Encountered error parsing lightning uri',
                    data,
                    err,
                )
            }
        },
    })

    // FIXME: properly url-encode this
    let uri = jwt ? `${fediMod.url}?token=${jwt}` : fediMod.url
    // TODO: Remove me after alpha, just to get webln working on faucet.
    if (uri.includes('https://faucet.mutinynet.dev.fedibtc.com')) {
        uri = `${uri}${uri.includes('?') ? '&' : '?'}webln=1`
    }

    const style = styles(insets)

    return (
        <View style={style.container}>
            <FediModBrowserHeader webViewRef={webview} fediMod={fediMod} />
            <WebView
                ref={webview}
                source={{ uri }}
                onLoadStart={() => setJsInjected(false)}
                onLoadProgress={e => {
                    if (!jsInjected && e.nativeEvent.progress > 0.75) {
                        const webLnJs = injectJs()
                        const jsToInject = `${webLnJs}${
                            fediModDebugMode
                                ? INJECTABLE_ERUDA_DEBUG_WIDGET
                                : ''
                        }`

                        webview.current.injectJavaScript(jsToInject)
                        setJsInjected(true)
                    }
                }}
                allowsInlineMediaPlayback
                onMessage={onMessage}
                style={{ width: '100%', height: '100%', flex: 1 }}
            />
            <MakeInvoiceOverlay
                fediMod={fediMod}
                requestInvoiceArgs={requestInvoiceArgs}
                onReject={err => {
                    overlayRejectRef.current?.(err)
                    setRequestInvoiceArgs(null)
                }}
                onAccept={paymentRequest => {
                    overlayResolveRef.current?.({ paymentRequest })
                    setRequestInvoiceArgs(null)
                }}
            />
            <SendPaymentOverlay
                fediMod={fediMod}
                invoice={invoiceToPay}
                onReject={err => {
                    overlayRejectRef.current?.(err)
                    setInvoiceToPay(null)
                }}
                onAccept={preimage => {
                    overlayResolveRef.current?.({ preimage })
                    setInvoiceToPay(null)
                }}
            />
            <AuthOverlay
                fediMod={fediMod}
                lnurlAuthRequest={lnurlAuthRequest}
                onReject={err => {
                    overlayRejectRef.current?.(err)
                    setLnurlAuthRequest(null)
                }}
                onAccept={() => {
                    setLnurlAuthRequest(null)
                }}
            />
        </View>
    )
}

const styles = (insets: EdgeInsets) =>
    StyleSheet.create({
        container: {
            flex: 1,
            paddingBottom: insets.bottom,
        },
    })

export default FediModBrowser
