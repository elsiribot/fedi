import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Keyboard, StyleSheet, View } from 'react-native'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'

import {
    selectActiveFederation,
    selectMaxReceiveAmount,
} from '@fedi/common/redux'
import amountUtils from '@fedi/common/utils/AmountUtils'

import AmountInput from '../components/ui/AmountInput'
import KeyboardAwareWrapper from '../components/ui/KeyboardAwareWrapper'
import SvgImage from '../components/ui/SvgImage'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppSelector, useBridge } from '../state/hooks'
import { Sats } from '../types'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'SendOfflineAmount'
>

const SendOfflineAmount: React.FC<Props> = () => {
    const insets = useSafeAreaInsets()
    const { theme } = useTheme()
    const navigation = useNavigation()
    const activeFederation = useAppSelector(selectActiveFederation)
    const maxReceiveAmount = useAppSelector(selectMaxReceiveAmount)
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

    const continueSend = () => {
        Keyboard.dismiss()
        onGenerateEcash()
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
                    onPress: continueSend,
                },
            ],
        )
    }

    const onChangeAmount = (updatedValue: Sats) => {
        if (maxReceiveAmount && updatedValue > maxReceiveAmount) {
            toast?.show(
                t('feature.receive.maximum-invoice-amount', {
                    maxAmount: amountUtils.formatSats(maxReceiveAmount as Sats),
                }),
                3000,
            )
        } else {
            toast?.close(0)
        }
        setAmount(updatedValue)
    }

    return (
        <KeyboardAwareWrapper>
            <View style={styles(theme, insets).container}>
                <Text caption>
                    {`${t('words.balance')}: `}
                    {`${amountUtils.formatNumber(
                        amountUtils.msatToSat(activeFederation?.balance!),
                    )} `}
                    {`${t('words.sats').toUpperCase()}`}
                </Text>

                <View style={styles(theme, insets).amountInputContainer}>
                    <AmountInput
                        amount={amount}
                        onChangeAmount={onChangeAmount}
                    />
                </View>
                <View style={styles(theme, insets).offlineContainer}>
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
                    containerStyle={styles(theme, insets).button}
                    loading={isLoading}
                />
            </View>
        </KeyboardAwareWrapper>
    )
}

const styles = (theme: Theme, insets: EdgeInsets) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: theme.spacing.sm,
            paddingHorizontal: theme.spacing.xl,
            paddingBottom: theme.spacing.xl + insets.bottom,
            width: '100%',
        },
        amountInputContainer: {
            marginTop: 'auto',
        },
        offlineContainer: {
            marginTop: 'auto',
            flexDirection: 'row',
            alignItems: 'center',
        },
        offlineIcon: {
            height: theme.sizes.sm,
            width: theme.sizes.sm,
            marginRight: theme.spacing.md,
        },
        button: {
            marginTop: 'auto',
        },
    })

export default SendOfflineAmount
