import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TextInput, View } from 'react-native'

import { useBridge } from '../contexts/FederationsContext'

import type { RootStackParamList } from '../types/navigation'
import amountUtils from '../utils/AmountUtils'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ConfirmSendOnChain'
>

const ConfirmSendOnChain: React.FC<Props> = ({ route }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const navigation = useNavigation()
    const { payAddress } = useBridge()
    const { address } = route.params
    const [isLoading, setIsLoading] = useState(false)
    const [amount, setAmount] = useState('')
    const [unit] = useState('sats')

    const onSendBtc = async () => {
        try {
            console.log('paying address', address, amount)
            setIsLoading(true)
            await payAddress(address, amountUtils.stringToSats(amount))
            console.log('paid')
            setIsLoading(false)
            navigation.navigate('SendSuccess', {
                amount: amountUtils.stringToSats(amount),
                unit,
            })
        } catch (error) {
            console.error(error)
            setIsLoading(false)
        }
    }

    const onChangeText = (updatedValue: string) => {
        setAmount(updatedValue)
    }

    return (
        <View style={styles(theme).container}>
            <View style={styles(theme).detailsContainer}>
                <Text style={styles(theme).address}>{address}</Text>
                <TextInput
                    onChangeText={onChangeText}
                    value={amount}
                    placeholder={`${t('words.amount')} (${t('words.sats')})`}
                    keyboardType="numeric"
                    returnKeyType="done"
                />
                <View style={styles(theme).buttonContainer}>
                    <Button
                        title={t('words.send')}
                        onPress={onSendBtc}
                        loading={isLoading}
                        fullWidth
                    />
                </View>
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
        text: {
            fontSize: theme.sizes.md,
            margin: theme.spacing.md,
        },
        address: {
            color: 'white',
        },
    })

export default ConfirmSendOnChain
