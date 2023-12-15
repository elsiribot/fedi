import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { MutableRefObject, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import {
    RequestInvoiceArgs,
    RequestInvoiceResponse,
    SendPaymentResponse,
    UnsupportedMethodError,
} from 'webln'

import { useIsNostrEnabled } from '@fedi/common/hooks/federation'
import {
    selectActiveFederation,
    selectAuthenticatedMember,
    selectFediModDebugMode,
} from '@fedi/common/redux'
import {
    Invoice,
    MSats,
    ParsedLnurlAuth,
    ParsedLnurlPay,
    ParsedLnurlWithdraw,
    ParserDataType,
} from '@fedi/common/types'
import {
    RpcLightningGatewayV0,
    RpcLightningGatewayV1,
} from '@fedi/common/types/bindings'
import amountUtils from '@fedi/common/utils/AmountUtils'
import { makeLog } from '@fedi/common/utils/log'
import {
    InjectionMessageType,
    generateInjectionJs,
    makeWebViewMessageHandler,
} from '@fedi/injections'
import {
    SignedNostrEvent,
    UnsignedNostrEvent,
} from '@fedi/injections/src/injectables/nostr/types'

import { fedimint } from '../bridge'
import { AuthOverlay } from '../components/feature/fedimods/AuthOverlay'
import FediModBrowserHeader from '../components/feature/fedimods/FediModBrowserHeader'
import { MakeInvoiceOverlay } from '../components/feature/fedimods/MakeInvoiceOverlay'
import { NostrSignOverlay } from '../components/feature/fedimods/NostrSignOverlay'
import { SendPaymentOverlay } from '../components/feature/fedimods/SendPaymentOverlay'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useOmniLinkInterceptor } from '../state/contexts/OmniLinkContext'
import { useAppSelector, useBridge } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

const log = makeLog('FediModBrowser')

export type Props = NativeStackScreenProps<RootStackParamList, 'FediModBrowser'>

type FediModResponse =
    | RequestInvoiceResponse
    | SendPaymentResponse
    | SignedNostrEvent
type FediModResolver<T> = (value: T | PromiseLike<T>) => void
type Gateway = RpcLightningGatewayV0 | RpcLightningGatewayV1

const FediModBrowser: React.FC<Props> = ({ route }) => {
    const { fediMod } = route.params
    const { listGateways, getNostrPubKey } = useBridge()
    const insets = useSafeAreaInsets()
    const { t } = useTranslation()
    const activeFederation = useAppSelector(selectActiveFederation)
    const authenticatedMember = useAppSelector(selectAuthenticatedMember)
    const fediModDebugMode = useAppSelector(selectFediModDebugMode)
    const nostrEnabled = useIsNostrEnabled()
    const { toast } = useEnvironmentContext().state
    const webview = useRef<WebView>() as MutableRefObject<WebView>
    const overlayResolveRef = useRef<
        FediModResolver<FediModResponse> | undefined
    >() as MutableRefObject<FediModResolver<FediModResponse> | undefined>
    const overlayRejectRef = useRef<(reason: Error) => void>()

    const [requestInvoiceArgs, setRequestInvoiceArgs] =
        useState<RequestInvoiceArgs | null>(null)
    const [lnurlWithdrawal, setLnurlWithdrawal] = useState<
        ParsedLnurlWithdraw['data'] | null
    >(null)
    const [invoiceToPay, setInvoiceToPay] = useState<Invoice | null>(null)
    const [lnurlPayment, setLnurlPayment] = useState<
        ParsedLnurlPay['data'] | null
    >(null)
    const [lnurlAuthRequest, setLnurlAuthRequest] = useState<
        ParsedLnurlAuth['data'] | null
    >(null)
    const [nostrUnsignedEvent, setNostrUnsignedEvent] =
        useState<UnsignedNostrEvent | null>(null)
    const getActiveGatewayPromiseRef = useRef<Promise<Gateway> | null>(null)

    // Intercept any URIs the user tries to navigate to that we can handle inline
    useOmniLinkInterceptor(parsedLink => {
        switch (parsedLink.type) {
            case ParserDataType.LnurlWithdraw:
                setLnurlWithdrawal(parsedLink.data)
                return true
            case ParserDataType.Bolt11:
                setInvoiceToPay(parsedLink.data)
                return true
            case ParserDataType.LnurlPay:
                setLnurlPayment(parsedLink.data)
                return true
            case ParserDataType.LnurlAuth:
                setLnurlAuthRequest(parsedLink.data)
                return true
        }
        return false
    })

    const getActiveGatewayOrThrow = async () => {
        if (getActiveGatewayPromiseRef.current)
            return getActiveGatewayPromiseRef.current
        getActiveGatewayPromiseRef.current = listGateways().then(gateways => {
            if (!gateways.length) {
                log.info('No available lightning gateways')
                throw new Error('No available lightning gateways')
            }
            return gateways.find(g => g.active) || gateways[0]
        })
        return getActiveGatewayPromiseRef.current
    }

    // Handle all messages coming from a WebLN-enabled site
    const onMessage = makeWebViewMessageHandler(webview, {
        [InjectionMessageType.webln_enable]: async () => {
            /* no-op */
            log.info('webln.enable')
        },
        [InjectionMessageType.webln_getInfo]: () => {
            log.info('webln.getInfo')
            return new Promise(async (resolve, reject) => {
                const alias = authenticatedMember?.username || ''
                let pubkey = ''
                try {
                    const gateway = await getActiveGatewayOrThrow()

                    if (gateway) {
                        pubkey = gateway.nodePubKey
                    }
                    resolve({ node: { alias, pubkey } })
                } catch (err) {
                    log.warn('Failed to list gateways for webln getInfo', err)
                    reject(t('errors.no-lightning-gateways'))
                }
            })
        },
        [InjectionMessageType.webln_makeInvoice]: async data => {
            log.info('webln.makeInvoice', data)
            // Check for an active gateway or throw error
            await getActiveGatewayOrThrow()

            // Wait for user to interact with alert
            return new Promise(async (resolve, reject) => {
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
        [InjectionMessageType.webln_sendPayment]: async data => {
            log.info('webln.sendPayment', data)
            // Check for an active gateway or throw error
            await getActiveGatewayOrThrow()

            let invoice: Invoice
            try {
                invoice = await fedimint.decodeInvoice(data)
            } catch (error) {
                log.error('sendPayment', 'error', error)
                toast?.show(t('phrases.failed-to-decode-invoice'), 3000)
                throw Error(t('phrases.failed-to-decode-invoice'))
            }
            // Wait for user to interact with alert
            return new Promise(async (resolve, reject) => {
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
        [InjectionMessageType.webln_signMessage]: async () => {
            log.info('webln.signMessage')
            throw new UnsupportedMethodError(
                t('errors.webln-method-not-supported', {
                    method: 'signMessage',
                }),
            )
        },
        [InjectionMessageType.webln_verifyMessage]: async () => {
            log.info('webln.verifyMessage')
            throw new UnsupportedMethodError(
                t('errors.webln-method-not-supported', {
                    method: 'verifyMessage',
                }),
            )
        },
        [InjectionMessageType.webln_keysend]: async () => {
            log.info('webln.keysend')
            throw new UnsupportedMethodError(
                t('errors.webln-method-not-supported', {
                    method: 'keysend',
                }),
            )
        },
        [InjectionMessageType.nostr_getPublicKey]: async () => {
            log.info('nostr.getPublicKey')
            return new Promise(async (resolve, reject) => {
                try {
                    const pub_key = await getNostrPubKey()
                    resolve(pub_key)
                } catch (err) {
                    log.warn('nostr.getPublicKey', err)
                    reject(t('errors.get-nostr-pubkey-failed'))
                }
            })
        },
        [InjectionMessageType.nostr_signEvent]: async evt => {
            log.info('nostr.signEvent', evt)
            // Wait for user to approve signing
            return new Promise<SignedNostrEvent>(async (resolve, reject) => {
                overlayRejectRef.current = reject
                overlayResolveRef.current =
                    resolve as FediModResolver<FediModResponse>
                setNostrUnsignedEvent(evt)
            })
        },
    })

    const resetOverlay = () => {
        setRequestInvoiceArgs(null)
        setLnurlWithdrawal(null)
        setInvoiceToPay(null)
        setLnurlPayment(null)
        setLnurlAuthRequest(null)
        setNostrUnsignedEvent(null)
    }

    const overlayProps = {
        fediMod,
        onReject: (err: Error) => {
            if (err && overlayRejectRef.current) {
                overlayRejectRef.current(err)
            }
            resetOverlay()
        },
        onAccept: (res?: FediModResponse) => {
            if (res && overlayResolveRef.current) {
                overlayResolveRef.current(res)
            }
            resetOverlay()
        },
    }

    let uri = fediMod.url
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
                webviewDebuggingEnabled={fediModDebugMode} // required for IOS debugging
                source={{ uri }}
                injectedJavaScriptBeforeContentLoaded={generateInjectionJs({
                    webln: true,
                    eruda: fediModDebugMode,
                    nostr: nostrEnabled,
                })}
                allowsInlineMediaPlayback
                onMessage={onMessage}
                style={{ width: '100%', height: '100%', flex: 1 }}
            />
            <MakeInvoiceOverlay
                {...overlayProps}
                requestInvoiceArgs={requestInvoiceArgs}
                lnurlWithdrawal={lnurlWithdrawal}
            />
            <SendPaymentOverlay
                {...overlayProps}
                invoice={invoiceToPay}
                lnurlPayment={lnurlPayment}
            />
            <AuthOverlay
                {...overlayProps}
                lnurlAuthRequest={lnurlAuthRequest}
            />
            <NostrSignOverlay
                {...overlayProps}
                nostrEvent={nostrUnsignedEvent}
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
