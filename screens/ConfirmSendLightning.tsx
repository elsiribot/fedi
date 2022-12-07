import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { Theme } from '@rneui/themed'
import { Button, Text, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, StyleSheet, View } from 'react-native'

import type { RootStackParamList } from '../Router'
import { decodeInvoice } from '../bridge'
import { useBridge } from '../contexts/FederationsContext'
import InvoiceUtils from '../utils/InvoiceUtils'
import StringUtils from '../utils/StringUtils'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ConfirmSendLightning'
>

const ConfirmSendLightning: React.FC<Props> = ({
    route,
    navigation,
}: Props) => {
    const { t } = useTranslation()
    const { payInvoice } = useBridge()
    const { theme } = useTheme()
    const { invoice } = route.params

    const [invoicePaid, setInvoicePaid] = useState(false)
    const [amount] = useState(InvoiceUtils.getAmountFromInvoice(invoice))
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
        <View style={styles(theme).container}>
            <View style={styles(theme).detailsContainer}>
                <Text>{t('feature.send.you-are-sending')}</Text>
                <Text>{`${amount} ${unit}`}</Text>
                <Text>{`${memo}`}</Text>
                <Text>{''}</Text>
                <Text>
                    {`${StringUtils.truncateMiddleOfString(invoice, 14)}`}
                </Text>
                <Text>{`${t('phrases.expires-in')} ${InvoiceUtils.formatExpiry(
                    expiry,
                )}`}</Text>
                <Text>{`${t('words.fee')}: ${InvoiceUtils.formatFee(
                    feeEstimate,
                )}`}</Text>
            </View>
            <View style={styles(theme).buttonContainer}>
                <Button title={t('words.send')} onPress={onSendBtc} />
            </View>
            <Modal
                animationType="fade"
                visible={invoicePaid}
                onRequestClose={() => {
                    navigation.navigate('Home')
                }}>
                <View style={styles(theme).modalContent}>
                    <Text style={styles(theme).modalText}>
                        {t('feature.send.you-sent')}
                    </Text>
                    <Text style={styles(theme).modalText}>
                        {`${amount} ${unit}`}
                    </Text>
                    <View style={styles(theme).buttonContainer}>
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

const styles = (theme: Theme) =>
    StyleSheet.create({
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
        modalContent: {
            backgroundColor: theme.colors.secondary,
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
        },
        modalText: {
            color: theme.colors.primary,
            fontSize: 30,
            margin: 10,
        },
        buttonContainer: {
            width: '90%',
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            margin: 10,
        },
    })

export default ConfirmSendLightning
