import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Image, Input, Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { Images } from '../assets/images'
import {
    useBridge,
    useFederationsContext,
} from '../contexts/FederationsContext'
import { Sats, SatsString } from '../types'

import type { RootStackParamList } from '../types/navigation'
import amountUtils from '../utils/AmountUtils'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'SendOfflineAmount'
>

const SendOfflineAmount: React.FC<Props> = () => {
    const { theme } = useTheme()
    const navigation = useNavigation()
    const { selectedFederation } = useFederationsContext().state
    const { t } = useTranslation()
    const [isLoading, setIsLoading] = useState(false)
    const [amount, setAmount] = useState<SatsString>('' as SatsString)
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

    const onChangeText = (updatedValue: SatsString) => {
        setAmount(updatedValue)
    }

    return (
        <View style={styles(theme).container}>
            <Text caption>
                {`${t('words.balance')}: `}
                {`${amountUtils.msatToSat(selectedFederation?.balance!)} `}
                {`${t('words.sats').toUpperCase()}`}
            </Text>
            <Input
                onChangeText={onChangeText as (_: string) => any}
                value={amount}
                placeholder={`${t('words.amount')} (${t('words.sats')})`}
                keyboardType="numeric"
                returnKeyType="done"
                containerStyle={styles(theme).textInput}
            />
            <View style={styles(theme).offlineContainer}>
                <Image
                    source={Images.Offline}
                    style={styles(theme).offlineIcon}
                />
                <Text caption>{t('phrases.you-are-offline')}</Text>
            </View>
            <Button
                fullWidth
                title={t('words.next')}
                onPress={onGenerateEcash}
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
