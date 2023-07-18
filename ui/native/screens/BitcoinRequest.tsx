import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'

import { selectFederationMetadata } from '@fedi/common/redux'
import type { Invoice, TransactionEvent } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'
import { shouldShowOnchainDeposits } from '@fedi/common/utils/FederationUtils'

import { fedimint } from '../bridge'
import ReceiveQr from '../components/feature/receive/ReceiveQr'
import FiatAmount from '../components/feature/wallet/FiatAmount'
import SvgImage from '../components/ui/SvgImage'
import { useAppSelector, useBridge } from '../state/hooks'
import { reset } from '../state/navigation'
import { BitcoinOrLightning, BtcLnUri, MSats } from '../types'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'BitcoinRequest'>

const BitcoinRequest: React.FC<Props> = ({ route, navigation }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const { generateAddress } = useBridge()
    const { uri } = route.params
    const activeFederationMetadata = useAppSelector(selectFederationMetadata)

    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [requestType, setRequestType] = useState<BitcoinOrLightning>(
        BitcoinOrLightning.lightning,
    )
    const [requestAmount, setRequestAmount] = useState<MSats | null>(null)
    const [requestNote, setRequestNote] = useState<string | null>(null)
    const [decodedUri, setDecodedUri] = useState<BtcLnUri>(
        new BtcLnUri({
            type: BitcoinOrLightning.lightning,
            body: '',
            paramsString: null,
        }),
    )
    const [onchainAddress, setOnchainAddress] = useState<string>('')
    const [invoice, setInvoice] = useState<Invoice>({
        paymentHash: '',
        amount: 0 as MSats,
        description: '',
        invoice: '',
        fee: null,
    })

    const decodeUri = useCallback(() => {
        const prefixIndex = uri.indexOf(':')
        const prefix = uri.substring(0, prefixIndex)

        let body = uri.substring(prefixIndex + 1)
        let params = null

        const paramsIndex = uri.indexOf('?')
        if (paramsIndex !== -1) {
            body = uri.substring(prefixIndex + 1, paramsIndex)
            params = uri.substring(paramsIndex + 1)
        }
        setDecodedUri(
            new BtcLnUri({
                type: prefix as BitcoinOrLightning,
                body,
                paramsString: params,
            }),
        )
    }, [uri])

    // Decodes the URI (bitcoin:xxx or lighting:xxx) passed as params
    useEffect(() => {
        decodeUri()
    }, [decodeUri])

    // Decodes the invoice from decodedUri
    useEffect(() => {
        if (
            decodedUri.type === BitcoinOrLightning.lightning &&
            decodedUri.body
        ) {
            setRequestType(BitcoinOrLightning.lightning)
            const getDecodedInvoice = async () => {
                try {
                    console.info(
                        'decoding invoice',
                        JSON.stringify(decodedUri.body),
                    )
                    const decoded = await fedimint.decodeInvoice(
                        decodedUri.body,
                    )
                    console.info('decoded invoice', decoded)
                    setInvoice(decoded)
                    setRequestAmount(decoded.amount)
                    setRequestNote(decoded.description)
                    // TODO: Integrate private notes
                    // setRequestNote(decoded.note)
                } catch (error) {
                    console.error('error decoding invoice', error)
                }
            }
            getDecodedInvoice()
        }
    }, [decodedUri])

    // Generate onchain address if needed
    useEffect(() => {
        if (requestType === BitcoinOrLightning.bitcoin && !onchainAddress) {
            const generateOnchainAddress = async () => {
                try {
                    setIsLoading(true)
                    const newAddress = await generateAddress()

                    setOnchainAddress(newAddress)
                } catch (error) {
                    console.error('error generating address', error)
                }
                setIsLoading(false)
            }

            generateOnchainAddress()
        }
    }, [generateAddress, onchainAddress, requestType])

    const transactionEventHandler = useCallback(
        (event: TransactionEvent) => {
            if (
                event.transaction.lightning?.invoice === invoice.invoice ||
                event.transaction.bitcoin?.address === onchainAddress
            )
                navigation.navigate('ReceiveSuccess', {
                    tx: event.transaction,
                })
        },
        [invoice, navigation, onchainAddress],
    )

    // Registers an event handler listening for the invoice to be paid
    useEffect(() => {
        const unsubscribe = fedimint.addListener(
            'transaction',
            transactionEventHandler,
        )
        return unsubscribe
    }, [transactionEventHandler])

    // FIXME: flesh this out
    const transactionV2EventHandler = useCallback(() => {
        navigation.dispatch(reset('TabsNavigator'))
    }, [navigation])
    useEffect(() => {
        const unsubscribe = fedimint.addListener(
            'transactionV2',
            transactionV2EventHandler,
        )
        return unsubscribe
    }, [transactionV2EventHandler])

    const showOnchainDeposits =
        activeFederationMetadata &&
        shouldShowOnchainDeposits(activeFederationMetadata)

    if (!decodedUri.body) {
        return <ActivityIndicator />
    }

    return (
        <View style={styles(theme).container}>
            {/*
                TODO: Re-enable lightning-onchain switcher
                when onchain deposits on mainnet are fixed
            */}
            {showOnchainDeposits && (
                <Pressable
                    style={styles(theme).switchContainer}
                    onPress={() =>
                        requestType === BitcoinOrLightning.lightning
                            ? setRequestType(BitcoinOrLightning.bitcoin)
                            : setRequestType(BitcoinOrLightning.lightning)
                    }>
                    <Text caption>
                        {requestType === BitcoinOrLightning.lightning
                            ? t('words.lightning')
                            : t('words.onchain')}
                    </Text>
                    {requestType === BitcoinOrLightning.lightning ? (
                        <SvgImage name="SwitchLeft" />
                    ) : (
                        <SvgImage name="SwitchRight" />
                    )}
                </Pressable>
            )}

            <View style={styles(theme).detailsContainer}>
                {requestAmount && (
                    <>
                        <Text h2>{`${amountUtils.formatNumber(
                            amountUtils.msatToSat(requestAmount),
                        )} ${t('words.sats').toUpperCase()}`}</Text>
                        <FiatAmount
                            amountSats={amountUtils.msatToSat(requestAmount)}
                        />
                    </>
                )}
                {requestNote && <Text small>{requestNote}</Text>}
            </View>
            {isLoading ? (
                <ActivityIndicator />
            ) : (
                <ReceiveQr
                    uri={
                        requestType === BitcoinOrLightning.lightning
                            ? decodedUri
                            : new BtcLnUri({
                                  type: BitcoinOrLightning.bitcoin,
                                  body: onchainAddress,
                                  paramsString: `amount=${amountUtils.msatToBtcString(
                                      requestAmount as MSats,
                                  )}${
                                      requestNote
                                          ? `&message=${requestNote}`
                                          : ''
                                  }`,
                              })
                    }
                    type={requestType}
                />
            )}
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: theme.spacing.xl,
        },
        detailsContainer: {
            paddingVertical: theme.spacing.md,
        },
        switchContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
        },
        switcherIconImage: {
            height: theme.sizes.sm,
            width: theme.sizes.sm,
        },
    })

export default BitcoinRequest
