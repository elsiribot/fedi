import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Keyboard, StyleSheet, View } from 'react-native'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'
import uuid from 'react-native-uuid'

import {
    selectActiveFederation,
    selectChatEncryptionKeys,
    selectMaxReceiveAmount,
} from '@fedi/common/redux'
import { Keypair, MSats } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'

import AmountInput from '../components/ui/AmountInput'
import KeyboardAwareWrapper from '../components/ui/KeyboardAwareWrapper'
import {
    addToMembersSeen,
    addToMessages,
    useChatContext,
} from '../state/contexts/ChatContext'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppSelector, useBridge } from '../state/hooks'
import { useXmpp } from '../state/hooks/chat'
import { Member, Message, Payment, PaymentStatus, Sats } from '../types'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'ChatWallet'>

const ChatWallet: React.FC<Props> = ({ navigation, route }: Props) => {
    const insets = useSafeAreaInsets()
    const { t } = useTranslation()
    const { theme } = useTheme()
    const activeFederation = useAppSelector(selectActiveFederation)
    const maxReceiveAmount = useAppSelector(selectMaxReceiveAmount)
    const activeChatEncryptionKeys = useAppSelector(selectChatEncryptionKeys)
    const [confirmingSend, setConfirmingSend] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [sendingEcash, setSendingEcash] = useState<boolean>(false)
    const [amount, setAmount] = useState<Sats>(0 as Sats)
    const { generateEcash } = useBridge()
    const { sendDirectMessage } = useXmpp()
    const { toast } = useEnvironmentContext().state
    const { state, dispatch } = useChatContext()
    const { recipient } = route.params

    useEffect(() => {
        const generateAndSendEcash = async () => {
            try {
                const millis = amountUtils.satToMsat(Number(amount) as Sats)
                const ecash = await generateEcash(millis as MSats)
                const messageWithEcash = new Message({
                    id: uuid.v4(),
                    content: 'fedi:payment-request:',
                    sentBy: new Member({
                        jid: state.xmppClient!.jid,
                    }),
                    sentTo: recipient,
                    sentAt: Date.now() / 1000,
                    payment: new Payment({
                        amount: millis,
                        recipient: recipient,
                        updatedAt: Date.now() / 1000,
                        status: PaymentStatus.accepted,
                        token: ecash,
                    }),
                })
                const withEncryptionKeys = activeChatEncryptionKeys as Keypair
                sendDirectMessage(
                    recipient,
                    messageWithEcash,
                    withEncryptionKeys,
                )
                dispatch(addToMessages(messageWithEcash))
                dispatch(addToMembersSeen(recipient))
                navigation.goBack()
            } catch (error) {
                console.error(error)
                toast?.show(t('errors.unknown-error'), 3000)
            }
            setSendingEcash(false)
        }
        if (sendingEcash) {
            generateAndSendEcash()
        }
    }, [
        activeChatEncryptionKeys,
        amount,
        dispatch,
        generateEcash,
        navigation,
        recipient,
        sendDirectMessage,
        sendingEcash,
        state.xmppClient,
        t,
        toast,
    ])

    const requestEcash = async () => {
        try {
            setIsLoading(true)
            const millis = amountUtils.satToMsat(Number(amount) as Sats)
            const me = new Member({
                jid: state.xmppClient!.jid,
            })
            const ecashRequest = new Message({
                id: uuid.v4(),
                content: 'fedi:payment-request:',
                sentBy: me,
                sentTo: recipient,
                sentAt: Date.now() / 1000,
                payment: new Payment({
                    amount: millis,
                    recipient: me,
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
            console.error(error)
            setIsLoading(false)
        }
    }

    const handleConfirmSend = async () => {
        console.info('sendEcash', amount, 'sats')
        setSendingEcash(true)
    }

    const handleSend = async () => {
        setConfirmingSend(true)
        Keyboard.dismiss()
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
        <KeyboardAwareWrapper additionalVerticalOffset={theme.spacing.md}>
            <View style={styles(theme, insets).container}>
                <Text caption>
                    {`${t('words.balance')}: `}
                    {`${amountUtils.formatNumber(
                        amountUtils.msatToSat(activeFederation?.balance!),
                    )} `}
                    {`${t('words.sats').toUpperCase()}`}
                </Text>

                <View>
                    <AmountInput
                        amount={amount}
                        onChangeAmount={onChangeAmount}
                    />
                </View>

                <View style={styles(theme, insets).buttonsGroupContainer}>
                    {confirmingSend ? (
                        <Button
                            title={t('feature.send.hold-to-confirm-send')}
                            onLongPress={handleConfirmSend}
                            containerStyle={
                                styles(theme, insets).buttonContainer
                            }
                            disabled={
                                !(activeFederation!.balance > 0) ||
                                !Number(amount) ||
                                sendingEcash ||
                                isLoading
                            }
                        />
                    ) : (
                        <>
                            <Button
                                title={t('words.request')}
                                onPress={requestEcash}
                                containerStyle={
                                    styles(theme, insets).buttonContainer
                                }
                                disabled={!Number(amount) || isLoading}
                            />
                            <Button
                                title={t('words.send')}
                                onPress={handleSend}
                                containerStyle={
                                    styles(theme, insets).buttonContainer
                                }
                                disabled={
                                    !(activeFederation!.balance > 0) ||
                                    !Number(amount) ||
                                    sendingEcash ||
                                    isLoading
                                }
                            />
                        </>
                    )}
                </View>
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
            paddingTop: theme.spacing.xl,
            paddingBottom: theme.spacing.xl + insets.bottom,
            width: '100%',
        },
        buttonsGroupContainer: {
            width: '100%',
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingHorizontal: theme.spacing.md,
        },
        buttonContainer: {
            margin: theme.spacing.sm,
            flex: 1,
        },
    })

export default ChatWallet
