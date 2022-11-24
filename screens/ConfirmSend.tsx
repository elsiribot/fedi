import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, NativeModules, StyleSheet, Text, View } from 'react-native'
import { Button } from '@rneui/themed'

import { useTheme } from '@react-navigation/native'
import type { RootStackParamList } from '../Router'
import { truncateMiddleOfString } from '../scripts/utils'

export type Props = NativeStackScreenProps<RootStackParamList, 'ConfirmSend'>

const {
    FedimintFfi: { payInvoice },
} = NativeModules

type FeeEstimate = {
    minimum: number
    maximum: number
    units: string
}

const formatExpiry = (expiryInSeconds: number): number => {
    // TODO: Format expiry to hours/seconds/minutes
    return expiryInSeconds
}

const formatFee = (feeEstimate: FeeEstimate): string => {
    return `~${feeEstimate.minimum} - ${feeEstimate.maximum} ${feeEstimate.units}`
}

// temporary function until decodeInvoice is available from FFI module
const getAmountFromInvoice = (invoice: string) => {
    const part = invoice.split('lnbcrt')[1]
    var prefixLocation = part.search(/\D/g)
    const amount = part.substring(0, prefixLocation)
    const prefix = part.substring(prefixLocation, prefixLocation + 1)
    const multiplier =
        prefix === 'm'
            ? 0.001
            : prefix === 'u'
            ? 0.000001
            : prefix === 'n'
            ? 0.000000001
            : 0.000000000001
    return Number(Number(amount) * multiplier * 100000000).toFixed(0)
}

const ConfirmSend: React.FC<Props> = ({ route, navigation }: Props) => {
    const { t } = useTranslation()
    const { colors } = useTheme()
    const { invoice } = route.params

    const [invoicePaid, setInvoicePaid] = useState(false)
    const [amount] = useState(getAmountFromInvoice(invoice))
    const [unit] = useState('sats')
    const [memo] = useState('Pineapple pizza slice')
    const [expiry] = useState(3600)
    const [feeEstimate] = useState({
        minimum: 3,
        maximum: 11,
        units: 'sats',
    })

    useEffect(() => {
        const decodeInvoice = async () => {
            // TODO: Call FedimintFfi.decodeInvoice and hydrate state
            // amount, unit, memo, expiry, feeEstimate
        }

        decodeInvoice()
    })

    const onSendBtc = async () => {
        try {
            console.log('paying invoice', invoice)
            await payInvoice(invoice)
            console.log('invoice paid')
            setInvoicePaid(true)
        } catch (error) {
            console.error(error)
        }
    }

    return (
        <View style={styles.container}>
            <View style={styles.detailsContainer}>
                <Text>{t('feature.send.you-are-sending')}</Text>
                <Text>{`${amount} ${unit}`}</Text>
                <Text>{`${memo}`}</Text>
                <Text>{''}</Text>
                <Text>{`${truncateMiddleOfString(invoice)}`}</Text>
                <Text>{`${t('phrases.expires-in')} ${formatExpiry(
                    expiry,
                )}`}</Text>
                <Text>{`${t('words.fee')}: ${formatFee(feeEstimate)}`}</Text>
            </View>
            <View style={styles.buttonContainer}>
                <Button title={t('words.send')} onPress={onSendBtc} />
            </View>
            <Modal
                animationType="fade"
                visible={invoicePaid}
                onRequestClose={() => {
                    navigation.navigate('Home')
                }}>
                <View
                    style={{
                        backgroundColor: colors.card,
                        ...styles.detailsContainer,
                        height: '100%',
                    }}>
                    <Text style={{ color: colors.text, ...styles.text }}>
                        {t('feature.send.you-sent')}
                    </Text>
                    <Text
                        style={{
                            color: colors.text,
                            ...styles.text,
                        }}>
                        {`${amount} ${unit}`}
                    </Text>
                    <View style={styles.buttonContainer}>
                        <Button
                            title={t('words.done')}
                            onPress={() => {
                                navigation.navigate('Home')
                            }}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-evenly',
    },
    detailsContainer: {
        height: '50%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonContainer: {
        width: '90%',
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        margin: 10,
    },
    text: {
        fontSize: 30,
        margin: 10,
    },
})

export default ConfirmSend
