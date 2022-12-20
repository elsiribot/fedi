import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { NavigationHook, RootStackParamList } from '../types/navigation'
import { decodeInvoice, Invoice } from '../bridge'
import { useBridge } from '../contexts/FederationsContext'
import stringUtils from '../utils/StringUtils'
import amountUtils from '../utils/AmountUtils'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ConfirmSendLightning'
>

const ConfirmSendLightning: React.FC<Props> = ({ route }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const navigation = useNavigation<NavigationHook>()
    const { payInvoice } = useBridge()
    const { invoice } = route.params

    const [isPayingInvoice, setIsPayingInvoice] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [decodedInvoice, setDecodedInvoice] = useState<Invoice | null>(null)
    const [unit] = useState('sats')

    useEffect(() => {
        const getDecodedInvoice = async () => {
            try {
                setIsLoading(true)
                const decoded = await decodeInvoice(invoice)
                console.log('decoded invoice', decoded)
                setDecodedInvoice(decoded)
            } catch (error) {
                console.error('getDecodedInvoice error')
                console.error(error)
            }
            setIsLoading(false)
        }

        getDecodedInvoice()
    }, [invoice])

    const onSendBtc = async () => {
        try {
            if (isPayingInvoice) return
            console.log('paying invoice', invoice)
            setIsLoading(true)
            setIsPayingInvoice(true)
            await payInvoice(invoice)
            console.log('invoice paid')
            setIsLoading(false)
            setIsPayingInvoice(false)
            navigation.replace('SendSuccess', {
                amount: decodedInvoice?.amount!,
                unit,
            })
        } catch (error) {
            console.error('onSendBtc error')
            console.error(error)
            setIsLoading(false)
            setIsPayingInvoice(false)
        }
    }

    if (!decodedInvoice) return <ActivityIndicator />

    return (
        <View style={styles(theme).container}>
            <View style={styles(theme).detailsContainer}>
                <Text>{t('feature.send.you-are-sending')}</Text>
                <Text>
                    {`${amountUtils.millisToSats(
                        decodedInvoice.amount,
                    )} ${unit}`}
                </Text>
                <Text>{`${decodedInvoice.description}`}</Text>
                <Text>{''}</Text>
                <Text>
                    {`${stringUtils.truncateMiddleOfString(invoice, 14)}`}
                </Text>
                {/* TODO: Uncomment if/when expiry is provided by decodeInvoice */}
                {/* <Text>{`${t('phrases.expires-in')} ${invoiceUtils.formatExpiry(
                    decodedInvoice?.expiryTime,
                )}`}</Text> */}
                {decodedInvoice.fee && (
                    <Text>
                        {`${t('words.fee')}: ${decodedInvoice.fee} ${unit}`}
                    </Text>
                    // TODO: Refactor if/when feeEstimate provides min/max/unit
                    // <Text>
                    //     {`${t('words.fee')}: ${invoiceUtils.formatFee(
                    //         decodedInvoice?.feeEstimate,
                    //     )}`}
                    // </Text>
                )}
            </View>
            <View style={styles(theme).buttonContainer}>
                <Button
                    title={t('words.send')}
                    onPress={onSendBtc}
                    loading={isLoading}
                    fullWidth
                />
            </View>
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
        buttonContainer: {
            width: '90%',
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            margin: theme.spacing.md,
        },
    })

export default ConfirmSendLightning
