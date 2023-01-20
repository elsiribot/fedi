import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Input, Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import uuid from 'react-native-uuid'

import { useCommunityContext } from '../state/contexts/CommunityContext'
import { useFederationsContext } from '../state/contexts/FederationsContext'
import { useXmpp } from '../state/hooks'
import { Message, Payment, PaymentStatus, Sats, SatsString } from '../types'
import type { RootStackParamList } from '../types/navigation'
import amountUtils from '../utils/AmountUtils'

export type Props = NativeStackScreenProps<RootStackParamList, 'ChatWallet'>

const ChatWallet: React.FC<Props> = ({ navigation, route }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { selectedFederation } = useFederationsContext().state
    const [isLoading, setIsLoading] = useState(false)
    const [amount, setAmount] = useState<SatsString>('' as SatsString)
    // const { generateEcash } = useBridge()
    const { sendDirectMessage } = useXmpp()
    const { authenticatedMember } = useCommunityContext().state
    const { recipient } = route.params

    const requestEcash = async () => {
        try {
            setIsLoading(true)
            const millis = amountUtils.satToMsat(Number(amount) as Sats)
            const ecashRequest = new Message({
                id: uuid.v4(),
                content: 'fedi:ecash-request:',
                sentBy: authenticatedMember,
                sentTo: recipient,
                sentAt: Date.now() / 1000,
                payment: new Payment({
                    amount: millis,
                    status: PaymentStatus.requested,
                }),
            })
            sendDirectMessage({
                to: recipient,
                message: ecashRequest,
            })
            setIsLoading(false)
            navigation.goBack()
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
            <View style={styles(theme).buttonsGroupContainer}>
                <Button
                    title={t('words.request')}
                    onPress={requestEcash}
                    containerStyle={styles(theme).buttonContainer}
                    disabled={!Number(amount) || isLoading}
                />
                <Button
                    title={t('words.send')}
                    onPress={() => {}}
                    containerStyle={styles(theme).buttonContainer}
                    disabled={
                        !(selectedFederation!.balance > 0) ||
                        !Number(amount) ||
                        isLoading
                    }
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
        buttonsGroupContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
        },
        buttonContainer: {
            margin: theme.spacing.sm,
            flex: 1,
        },
    })

export default ChatWallet
