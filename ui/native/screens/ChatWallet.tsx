import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import uuid from 'react-native-uuid'

import {
    selectActiveFederation,
    selectChatEncryptionKeys,
} from '@fedi/common/redux'
import { Keypair } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'

import AmountInput from '../components/ui/AmountInput'
import { MAX_INVOICE_AMOUNT_SATS } from '../constants'
import {
    addToMembersSeen,
    addToMessages,
    useChatContext,
} from '../state/contexts/ChatContext'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppSelector } from '../state/hooks'
import { useXmpp } from '../state/hooks/chat'
import { Member, Message, Payment, PaymentStatus, Sats } from '../types'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'ChatWallet'>

const ChatWallet: React.FC<Props> = ({ navigation, route }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const activeFederation = useAppSelector(selectActiveFederation)
    const activeChatEncryptionKeys = useAppSelector(selectChatEncryptionKeys)
    const [isLoading, setIsLoading] = useState(false)
    const [amount, setAmount] = useState<Sats>(0 as Sats)
    const { sendDirectMessage } = useXmpp()
    const { toast } = useEnvironmentContext().state
    const { state, dispatch } = useChatContext()
    const { recipient } = route.params

    const requestEcash = async () => {
        try {
            setIsLoading(true)
            const millis = amountUtils.satToMsat(Number(amount) as Sats)
            const ecashRequest = new Message({
                id: uuid.v4(),
                content: 'fedi:payment-request:',
                sentBy: new Member({
                    jid: state.xmppClient!.jid,
                }),
                sentTo: recipient,
                sentAt: Date.now() / 1000,
                payment: new Payment({
                    amount: millis,
                    status: PaymentStatus.requested,
                    updatedAt: Date.now() / 1000,
                }),
            })
            const withEncryptionKeys = activeChatEncryptionKeys as Keypair
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

            <AmountInput amount={amount} onChangeAmount={onChangeAmount} />
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
                        !(activeFederation!.balance > 0) ||
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
