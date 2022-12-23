import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { NavigationHook, RootStackParamList } from '../types/navigation'
import { decodeInvoice, Invoice } from '../bridge'
import {
    useBridge,
    useFederationsContext,
} from '../contexts/FederationsContext'
import stringUtils from '../utils/StringUtils'
import amountUtils from '../utils/AmountUtils'
import LineBreak from '../components/ui/LineBreak'
import { MSats } from '../types'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ConfirmSendLightning'
>

const ConfirmSendLightning: React.FC<Props> = ({ route }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const navigation = useNavigation<NavigationHook>()
    const { selectedFederation } = useFederationsContext().state
    const { payInvoice } = useBridge()
    const { lightningUri } = route.params

    const [isPayingInvoice, setIsPayingInvoice] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [decodedInvoice, setDecodedInvoice] = useState<Invoice>({
        paymentHash: '',
        amount: 0 as MSats,
        description: '',
        invoice: '',
        fee: null,
    })
    const [unit] = useState('sats')

    useEffect(() => {
        const getDecodedInvoice = async () => {
            try {
                setIsLoading(true)
                const decoded = await decodeInvoice(lightningUri.body)
                console.log('decoded invoice', decoded)
                setDecodedInvoice(decoded)
            } catch (error) {
                console.error('getDecodedInvoice error')
                console.error(error)
            }
            setIsLoading(false)
        }

        getDecodedInvoice()
    }, [lightningUri])

    const onSendBtc = async () => {
        try {
            if (isPayingInvoice) return
            console.log('paying invoice', decodedInvoice?.invoice)
            setIsLoading(true)
            setIsPayingInvoice(true)
            await payInvoice(decodedInvoice?.invoice)
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

    if (!decodedInvoice.amount) return <ActivityIndicator />

    return (
        <View style={styles(theme).container}>
            <Text caption>
                {`${t('words.balance')}: `}
                {`${amountUtils.msatToSat(selectedFederation?.balance!)} `}
                {`${t('words.sats').toUpperCase()}`}
            </Text>
            <View style={styles(theme).detailsContainer}>
                {decodedInvoice.amount && (
                    <Text h2>{`${amountUtils.msatToSat(
                        decodedInvoice.amount,
                    )} ${t('words.sats').toUpperCase()}`}</Text>
                )}
                {decodedInvoice.description && (
                    <Text small>{decodedInvoice.description}</Text>
                )}
                <LineBreak />
                <Text>
                    {`${stringUtils.truncateMiddleOfString(
                        decodedInvoice.invoice,
                        14,
                    )}`}
                </Text>
            </View>
            <View style={styles(theme).buttonContainer}>
                <Button
                    title={`${t('words.send')}${
                        decodedInvoice.amount
                            ? ` ${amountUtils.msatToSat(
                                  decodedInvoice.amount,
                              )} `
                            : ' '
                    }${t('words.sats').toUpperCase()}`}
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
            justifyContent: 'space-between',
            padding: theme.spacing.xl,
        },
        detailsContainer: {
            alignItems: 'center',
            paddingVertical: theme.spacing.xl,
        },
        buttonContainer: {
            width: '90%',
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            margin: theme.spacing.md,
        },
    })

export default ConfirmSendLightning
