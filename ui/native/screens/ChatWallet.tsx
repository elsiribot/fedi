import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Input, Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import uuid from 'react-native-uuid'

import amountUtils from '@fedi/common/utils/AmountUtils'

import UsdAmount from '../components/feature/wallet/UsdAmount'
import {
    addToMembersSeen,
    addToMessages,
    useChatContext,
} from '../state/contexts/ChatContext'
import { useFederationsContext } from '../state/contexts/FederationsContext'
import { useXmpp } from '../state/hooks/chat'
import {
    Keypair,
    Message,
    Payment,
    PaymentStatus,
    Sats,
    SatsString,
} from '../types'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'ChatWallet'>

const ChatWallet: React.FC<Props> = ({ navigation, route }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { selectedFederation } = useFederationsContext().state
    const [isLoading, setIsLoading] = useState(false)
    const [amount, setAmount] = useState<SatsString>('' as SatsString)
    const { sendDirectMessage } = useXmpp()
    const { state, dispatch } = useChatContext()
    const { authenticatedMember } = state
    const { recipient } = route.params

    const requestEcash = async () => {
        try {
            setIsLoading(true)
            const millis = amountUtils.satToMsat(Number(amount) as Sats)
            const ecashRequest = new Message({
                id: uuid.v4(),
                content: 'fedi:payment-request:',
                sentBy: authenticatedMember,
                sentTo: recipient,
                sentAt: Date.now() / 1000,
                payment: new Payment({
                    amount: millis,
                    status: PaymentStatus.requested,
                    updatedAt: Date.now() / 1000,
                }),
            })
            const withEncryptionKeys = state.encryptionKeys as Keypair
            sendDirectMessage(recipient, ecashRequest, withEncryptionKeys)
            dispatch(addToMessages(ecashRequest))
            dispatch(addToMembersSeen(recipient))
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
                {`${amountUtils.formatNumber(
                    amountUtils.msatToSat(selectedFederation?.balance!),
                )} `}
                {`${t('words.sats').toUpperCase()}`}
            </Text>
            <Input
                autoFocus
                onChangeText={onChangeText as (_: string) => any}
                value={amount}
                placeholder={`${t('words.amount')} (${t('words.sats')})`}
                keyboardType="numeric"
                returnKeyType="done"
                containerStyle={styles(theme).textInput}
            />
            <UsdAmount amountSats={Number(amount) as Sats} />
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
                        isLoading ||
                        true
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
