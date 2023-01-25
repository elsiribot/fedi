import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Input, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import UsdAmount from '../components/feature/wallet/UsdAmount'

import { useFederationsContext } from '../state/contexts/FederationsContext'
import { useBridge } from '../state/hooks'
import { Btc, Sats, SatsString } from '../types'
import type { RootStackParamList } from '../types/navigation'
import amountUtils from '../utils/AmountUtils'
import stringUtils from '../utils/StringUtils'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ConfirmSendOnChain'
>

const ConfirmSendOnChain: React.FC<Props> = ({ route }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const navigation = useNavigation()
    const { selectedFederation } = useFederationsContext().state
    const { payAddress } = useBridge()
    const { bitcoinUri } = route.params
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [amount, setAmount] = useState<SatsString>('' as SatsString)
    const [unit] = useState('sats')

    useEffect(() => {
        if (bitcoinUri.queryParams?.amount) {
            const amountInSats = amountUtils.btcToSat(
                Number(bitcoinUri.queryParams?.amount) as Btc,
            )
            setAmount(String(amountInSats) as SatsString)
        }
    }, [bitcoinUri])

    const onSendBtc = async () => {
        try {
            console.info('paying address', bitcoinUri.body, amount)
            setIsLoading(true)
            await payAddress(bitcoinUri.body, Number(amount) as Sats)
            setIsLoading(false)
            navigation.navigate('SendSuccess', {
                amount: amountUtils.satToMsat(Number(amount) as Sats),
                unit,
            })
        } catch (error) {
            console.error(error)
            setIsLoading(false)
        }
    }

    const onChangeText = (updatedValue: SatsString) => {
        setAmount(updatedValue)
    }

    if (!bitcoinUri.body) return <ActivityIndicator />

    return (
        <View style={styles(theme).container}>
            <Text caption>
                {`${t('words.balance')}: `}
                {`${amountUtils.msatToSat(selectedFederation?.balance!)} `}
                {`${t('words.sats').toUpperCase()}`}
            </Text>
            <View style={styles(theme).detailsContainer}>
                <Input
                    onChangeText={onChangeText as (_: string) => any}
                    value={amount}
                    placeholder={`${t('words.amount')} (${t('words.sats')})`}
                    keyboardType="numeric"
                    returnKeyType="done"
                    containerStyle={styles(theme).textInput}
                />
                <UsdAmount amountSats={Number(amount) as Sats} />
                <Text>
                    {`${stringUtils.truncateMiddleOfString(
                        bitcoinUri.body,
                        14,
                    )}`}
                </Text>
            </View>
            <Button
                title={`${t('words.send')}${
                    amount ? ` ${amount} ${t('words.sats').toUpperCase()}` : ''
                }`}
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
