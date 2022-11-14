import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Text, StyleSheet, View, NativeModules } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import type { RootStackParamList } from '../App'

export type Props = NativeStackScreenProps<RootStackParamList, 'ConfirmSend'>

const {
    FedimintFfi: { payInvoice },
} = NativeModules

type FeeEstimate = {
    minimum: number
    maximum: number
    units: string
}

const truncateInvoice = (invoice: string): string => {
    return `${invoice.substring(0, 14)} ... ${invoice.slice(-14)}`
}

const formatExpiry = (expiryInSeconds: number): number => {
    // TODO: Format expiry to hours/seconds/minutes
    return expiryInSeconds
}

const formatFee = (feeEstimate: FeeEstimate): string => {
    return `~${feeEstimate.minimum} - ${feeEstimate.maximum} ${feeEstimate.units}`
}

const ConfirmSend: React.FC<Props> = ({ route }: Props) => {
    const { t } = useTranslation()
    const { invoice } = route.params

    const [amount] = useState('0.00615')
    const [unit] = useState('BTC')
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

    const onSendBtc = () => {
        payInvoice(invoice)
    }

    return (
        <View style={styles.container}>
            <View style={styles.detailsContainer}>
                <Text>{t('feature.send.you-are-sending')}</Text>
                <Text>{`${amount} ${unit}`}</Text>
                <Text>{`${memo}`}</Text>
                <Text>{``}</Text>
                <Text>{`${truncateInvoice(invoice)}`}</Text>
                <Text>{`${t('phrases.expires-in')} ${formatExpiry(
                    expiry,
                )}`}</Text>
                <Text>{`${t('words.fee')}: ${formatFee(feeEstimate)}`}</Text>
            </View>
            <View style={styles.buttonContainer}>
                <Button title={t('words.send')} onPress={onSendBtc} />
            </View>
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
        justifyContent: 'center',
    },
    buttonContainer: {
        width: '90%',
        flexDirection: 'row',
        justifyContent: 'space-evenly',
    },
})

export default ConfirmSend
