import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { decodeInvoice, Invoice } from '../bridge'
import UsdAmount from '../components/feature/wallet/UsdAmount'
import LineBreak from '../components/ui/LineBreak'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useFederationsContext } from '../state/contexts/FederationsContext'
import { useBridge } from '../state/hooks'
import { MSats } from '../types'
import { NavigationHook, RootStackParamList } from '../types/navigation'
import amountUtils from '@fedi/common/utils/AmountUtils'
import stringUtils from '@fedi/common/utils/StringUtils'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ConfirmSendLightning'
>

const DEFAULT_DECODED_INVOICE = {
    paymentHash: '',
    amount: 0 as MSats,
    description: '',
    invoice: '',
    fee: null,
}

const ConfirmSendLightning: React.FC<Props> = ({ route }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const navigation = useNavigation<NavigationHook>()
    const { selectedFederation } = useFederationsContext().state
    const { toast } = useEnvironmentContext().state
    const { payInvoice } = useBridge()
    const { lightningUri } = route.params

    const [unit] = useState('sats')
    const [invoicePaid, setInvoicePaid] = useState<boolean>(false)
    const [isPayingInvoice, setIsPayingInvoice] = useState<boolean>(false)
    const [decodedInvoice, setDecodedInvoice] = useState<Invoice>(
        DEFAULT_DECODED_INVOICE,
    )

    useEffect(() => {
        const getDecodedInvoice = async () => {
            try {
                const decoded = await decodeInvoice(lightningUri.body)
                console.log('decoded invoice', decoded)
                setDecodedInvoice(decoded)
            } catch (error) {
                console.error('getDecodedInvoice', error)
            }
        }

        getDecodedInvoice()

        return () => {
            setDecodedInvoice(DEFAULT_DECODED_INVOICE)
        }
    }, [lightningUri])

    useEffect(() => {
        const sendPayment = async () => {
            try {
                console.log('paying invoice', decodedInvoice?.invoice)
                await payInvoice(decodedInvoice?.invoice)
                console.log('invoice paid')
                setInvoicePaid(true)
            } catch (error) {
                console.error('onSendBtc', error)
                toast?.show((error as Error).message, 3000)
            }
            setIsPayingInvoice(false)
        }
        if (isPayingInvoice && decodedInvoice.invoice) {
            sendPayment()
        }
    }, [decodedInvoice.invoice, isPayingInvoice, payInvoice, toast])

    useEffect(() => {
        if (invoicePaid && isPayingInvoice === false) {
            navigation.replace('SendSuccess', {
                amount: decodedInvoice?.amount!,
                unit,
            })
        }
    }, [decodedInvoice?.amount, invoicePaid, isPayingInvoice, navigation, unit])

    if (!decodedInvoice.amount) return <ActivityIndicator />

    return (
        <View style={styles(theme).container}>
            <Text caption>
                {`${t('words.balance')}: `}
                {`${amountUtils.formatNumber(
                    amountUtils.msatToSat(selectedFederation?.balance!),
                )} `}
                {`${t('words.sats').toUpperCase()}`}
            </Text>
            <View style={styles(theme).detailsContainer}>
                {decodedInvoice.amount && (
                    <>
                        <Text h2>
                            {`${amountUtils.formatNumber(
                                amountUtils.msatToSat(decodedInvoice.amount),
                            )} ${t('words.sats').toUpperCase()}`}
                        </Text>
                        <UsdAmount
                            amountSats={amountUtils.msatToSat(
                                decodedInvoice.amount,
                            )}
                        />
                    </>
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
                            ? ` ${amountUtils.formatNumber(
                                  amountUtils.msatToSat(decodedInvoice.amount),
                              )} `
                            : ' '
                    }${t('words.sats').toUpperCase()}`}
                    onPress={() => setIsPayingInvoice(true)}
                    loading={isPayingInvoice}
                    disabled={isPayingInvoice}
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
