import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, StyleSheet, View } from 'react-native'

import { selectActiveFederation } from '@fedi/common/redux'
import amountUtils from '@fedi/common/utils/AmountUtils'

import AmountInput from '../components/ui/AmountInput'
import SvgImage from '../components/ui/SvgImage'
import { MAX_INVOICE_AMOUNT_SATS } from '../constants'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppSelector, useBridge } from '../state/hooks'
import { Sats } from '../types'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'SendOfflineAmount'
>

const SendOfflineAmount: React.FC<Props> = () => {
    const { theme } = useTheme()
    const navigation = useNavigation()
    const activeFederation = useAppSelector(selectActiveFederation)
    const { t } = useTranslation()
    const [isLoading, setIsLoading] = useState(false)
    const [amount, setAmount] = useState<Sats>(0 as Sats)
    const { toast } = useEnvironmentContext().state
    const { generateEcash } = useBridge()

    const onGenerateEcash = async () => {
        try {
            setIsLoading(true)
            const millis = amountUtils.satToMsat(Number(amount) as Sats)
            const ecash = await generateEcash(millis)
            setIsLoading(false)
            navigation.navigate('SendOfflineQr', { ecash, amount: millis })
        } catch (error) {
            console.log(error)
            setIsLoading(false)
        }
    }

    const onNext = () => {
        Alert.alert(
            t('phrases.please-confirm'),
            t('feature.send.offline-send-warning'),
            [
                {
                    text: t('phrases.go-back'),
                },
                {
                    text: t('words.continue'),
                    onPress: onGenerateEcash,
                },
            ],
        )
    }

    const onChangeAmount = (updatedValue: Sats) => {
        if (updatedValue > MAX_INVOICE_AMOUNT_SATS) {
            toast?.show(t('feature.receive.maximum-invoice-amount'), 3000)
        } else {
            toast?.close(0)
        }
        setAmount(updatedValue)
    }

    return (
        <View style={styles(theme).container}>
            <Text caption>
                {`${t('words.balance')}: `}
                {`${amountUtils.formatNumber(
                    amountUtils.msatToSat(activeFederation?.balance!),
                )} `}
                {`${t('words.sats').toUpperCase()}`}
            </Text>

            <View>
                <AmountInput amount={amount} onChangeAmount={onChangeAmount} />
            </View>
            <View style={styles(theme).offlineContainer}>
                <SvgImage
                    name="Offline"
                    containerStyle={{
                        marginRight: theme.spacing.md,
                    }}
                />
                <Text caption>{t('phrases.you-are-offline')}</Text>
            </View>
            <Button
                fullWidth
                title={t('words.next')}
                onPress={onNext}
                loading={isLoading}
            />
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
        offlineContainer: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        offlineIcon: {
            height: theme.sizes.sm,
            width: theme.sizes.sm,
            marginRight: theme.spacing.md,
        },
        textInput: {
            width: '80%',
        },
    })

export default SendOfflineAmount
