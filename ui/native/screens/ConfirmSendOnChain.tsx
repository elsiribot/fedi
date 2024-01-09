import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Input, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { useBalanceDisplay } from '@fedi/common/hooks/amount'
import amountUtils from '@fedi/common/utils/AmountUtils'
import stringUtils from '@fedi/common/utils/StringUtils'
import { makeLog } from '@fedi/common/utils/log'

import FiatAmount from '../components/feature/wallet/FiatAmount'
import { useBridge } from '../state/hooks'
import { Btc, ParserDataType, Sats, SatsString } from '../types'
import type { RootStackParamList } from '../types/navigation'

const log = makeLog('ConfirmSendOnChain')

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ConfirmSendOnChain'
>

const ConfirmSendOnChain: React.FC<Props> = ({ route }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const navigation = useNavigation()
    const balanceDisplay = useBalanceDisplay(t)
    const { payAddress } = useBridge()
    const { bitcoinUri } = route.params
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [amount, setAmount] = useState<SatsString>('' as SatsString)
    const [unit] = useState('sats')

    useEffect(() => {
        if (
            bitcoinUri.type === ParserDataType.Bip21 &&
            bitcoinUri.data.amount
        ) {
            const amountInSats = amountUtils.btcToSat(
                Number(bitcoinUri.data?.amount) as Btc,
            )
            setAmount(String(amountInSats) as SatsString)
        }
    }, [bitcoinUri])

    const onSendBtc = async () => {
        try {
            log.info('paying address', bitcoinUri.data.address, amount)
            setIsLoading(true)
            await payAddress(bitcoinUri.data.address, Number(amount) as Sats)

            setIsLoading(false)
            navigation.navigate('SendSuccess', {
                amount: amountUtils.satToMsat(Number(amount) as Sats),
                unit,
            })
        } catch (error) {
            log.error('onSendBtc', error)
            setIsLoading(false)
        }
    }

    const onChangeText = (updatedValue: SatsString) => {
        setAmount(updatedValue)
    }

    if (!bitcoinUri.data) return <ActivityIndicator />

    return (
        <View style={styles(theme).container}>
            <Text caption>{balanceDisplay}</Text>
            <View style={styles(theme).detailsContainer}>
                <Input
                    onChangeText={onChangeText as (_: string) => any}
                    value={amount}
                    placeholder={`${t('words.amount')} (${t('words.sats')})`}
                    keyboardType="numeric"
                    returnKeyType="done"
                    containerStyle={styles(theme).textInput}
                />
                <FiatAmount amountSats={Number(amount) as Sats} />
                <Text>
                    {`${stringUtils.truncateMiddleOfString(
                        bitcoinUri.data.address,
                        14,
                    )}`}
                </Text>
            </View>
            <Button
                title={
                    amount
                        ? t('feature.send.send-amount-unit', {
                              amount: amountUtils.formatNumber(Number(amount)),
                              unit: t('words.sats').toUpperCase(),
                          })
                        : t('words.send')
                }
                onPress={onSendBtc}
                loading={isLoading}
                fullWidth
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
        button: {
            marginTop: 'auto',
        },
        detailsContainer: {
            alignItems: 'center',
            width: '100%',
        },
        textInput: {
            width: '90%',
            marginTop: 'auto',
        },
    })

export default ConfirmSendOnChain
