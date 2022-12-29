import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Image, Text, Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'

import { Images } from '../assets/images'
import {
    decodeInvoice,
    Invoice,
    TFedimintEventEmitter,
    Transaction,
    TransactionEvent,
} from '../bridge'
import ReceiveQr from '../components/feature/receive/ReceiveQr'
import { useBridge } from '../contexts/FederationsContext'
import { BitcoinOrLightning, BtcLnUri, MSats } from '../types'
import type { RootStackParamList } from '../types/navigation'
import amountUtils from '../utils/AmountUtils'

export type Props = NativeStackScreenProps<RootStackParamList, 'BitcoinRequest'>

const BitcoinRequest: React.FC<Props> = ({ route, navigation }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const { generateAddress } = useBridge()
    const { uri } = route.params
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
                    const decoded = await decodeInvoice(decodedUri.body)
                    console.log('decoded invoice', decoded)
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
                    tx: new Transaction(event.transaction),
                })
        },
        [invoice, navigation, onchainAddress],
    )

    // Registers an event handler listening for the invoice to be paid
    useEffect(() => {
        const emitter = new TFedimintEventEmitter()
        emitter.onTransaction(transactionEventHandler)

        return () => {
            emitter.removeListener('transaction')
        }
    }, [transactionEventHandler])

    if (!decodedUri.body) {
        return <ActivityIndicator />
    }

    return (
        <View style={styles(theme).container}>
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
                <Image
                    source={
                        requestType === BitcoinOrLightning.lightning
                            ? Images.SwitchLeft
                            : Images.SwitchRight
                    }
                    style={styles(theme).switcherIconImage}
                />
            </Pressable>
            <View style={styles(theme).detailsContainer}>
                {requestAmount && (
                    <Text h2>{`${amountUtils.msatToSat(requestAmount)} ${t(
                        'words.sats',
                    ).toUpperCase()}`}</Text>
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
