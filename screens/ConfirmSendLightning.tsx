import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import type { RootStackParamList } from '../types/navigation'
import { decodeInvoice } from '../bridge'
import { useBridge } from '../contexts/FederationsContext'
import invoiceUtils from '../utils/InvoiceUtils'
import stringUtils from '../utils/StringUtils'
import SendConfirmationModal from '../components/feature/send/SendConfirmationModal'
import amountUtils from '../utils/AmountUtils'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ConfirmSendLightning'
>

const ConfirmSendLightning: React.FC<Props> = ({ route }: Props) => {
    const { t } = useTranslation()
    const { payInvoice } = useBridge()
    const { invoice } = route.params

    const [invoicePaid, setInvoicePaid] = useState(false)
    const [amount] = useState(invoiceUtils.getAmountFromInvoice(invoice))
    const [unit] = useState('sats')
    const [memo] = useState('Pineapple pizza slice')
    const [expiry] = useState(3600)
    const [feeEstimate] = useState({
        minimum: 3,
        maximum: 11,
        units: 'sats',
    })

    useEffect(() => {
        const _decodeInvoice = async () => {
            const decoded = await decodeInvoice(invoice)
            console.log('decoded invoice', decoded)
        }

        _decodeInvoice()
    }, [invoice])

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
                <Text>
                    {`${stringUtils.truncateMiddleOfString(invoice, 14)}`}
                </Text>
                <Text>{`${t('phrases.expires-in')} ${invoiceUtils.formatExpiry(
                    expiry,
                )}`}</Text>
                <Text>{`${t('words.fee')}: ${invoiceUtils.formatFee(
                    feeEstimate,
                )}`}</Text>
            </View>
            <View style={styles.buttonContainer}>
                <Button title={t('words.send')} onPress={onSendBtc} />
            </View>
            <SendConfirmationModal
                visible={invoicePaid}
                amount={amountUtils.stringToSats(amount)}
                unit={unit}
            />
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
})

export default ConfirmSendLightning
