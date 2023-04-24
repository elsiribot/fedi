import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import type { ValidateEcashResponse } from '@fedi/common/types'
import { Keypair } from '@fedi/common/types'

import {
    updateMessage,
    useChatContext,
} from '../../../state/contexts/ChatContext'
import { useBridge } from '../../../state/hooks'
import { useXmpp } from '../../../state/hooks/chat'
import { Member, Message, Payment, PaymentStatus } from '../../../types'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'

type IncomingPaymentActionsProps = {
    message: Message
    onCancel: () => void
}

const IncomingPaymentActions: React.FC<IncomingPaymentActionsProps> = ({
    message,
    onCancel,
}: IncomingPaymentActionsProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { receiveEcash, validateEcash } = useBridge()
    const { sendDirectMessage } = useXmpp()
    const { state, dispatch } = useChatContext()
    const [broadcastingUpdate, setBroadcastingUpdate] = useState<boolean>(false)
    // const [tokenWasSpent, setTokenWasSpent] = useState<boolean>(false)
    const [validatingToken, setValidatingToken] = useState<boolean>(false)
    const [processingRedemption, setProcessingRedemption] =
        useState<ValidateEcashResponse | null>(null)
    const { payment, sentTo } = message

    // When paymentProcessing begins, ...
    useEffect(() => {
        if (broadcastingUpdate) {
            setBroadcastingUpdate(false)
            const acceptedPaymentMessage = new Message({
                ...message,
                payment: {
                    ...payment,
                    updatedAt: Date.now() / 1000,
                    status: PaymentStatus.paid,
                    token: null,
                },
            })
            const withEncryptionKeys = state.encryptionKeys as Keypair
            const updatePayment = true
            sendDirectMessage(
                sentTo as Member,
                acceptedPaymentMessage,
                withEncryptionKeys,
                updatePayment,
            )
            dispatch(updateMessage(acceptedPaymentMessage))
        }
    }, [
        broadcastingUpdate,
        dispatch,
        message,
        payment,
        sendDirectMessage,
        sentTo,
        state.encryptionKeys,
    ])

    useEffect(() => {
        const redeemEcash = async () => {
            try {
                setProcessingRedemption(null)
                await receiveEcash(payment?.token!)
                setBroadcastingUpdate(true)
            } catch (error) {
                console.error('receiveEcash', error)
                // setTokenWasSpent(true)
            }
        }
        if (processingRedemption !== null && payment?.token) {
            redeemEcash()
        }
    }, [payment?.token, processingRedemption, receiveEcash])

    // TODO: Handle if a token is already spent
    // useEffect(() => {
    //     if (tokenWasSpent === true) {
    //         updateAndBroadcastSpentPayment()
    //     }
    // }, [tokenWasSpent])

    useEffect(() => {
        const checkForSpentToken = async (ecash: string) => {
            try {
                const result = await validateEcash(ecash)
                if (result.valid) {
                    setProcessingRedemption(result)
                } else {
                    // TODO: Handle invalid ecash tokens
                }
            } catch (error) {
                console.error('validateEcash', error)
            }
        }
        if (payment?.token && validatingToken === true) {
            checkForSpentToken(payment?.token!)
        }
    }, [validatingToken, payment?.token, validateEcash])

    // Check for valid ecash if found in incoming message
    useEffect(() => {
        if (payment?.token && payment?.status !== PaymentStatus.paid) {
            setValidatingToken(true)
        }
    }, [payment?.token, payment?.status])

    const renderPaymentStatus = () => {
        let paymentStatus = (
            <View style={styles(theme).statusContainer}>
                <Text medium caption style={styles(theme).statusText}>
                    {t('words.pending')}
                </Text>
            </View>
        )
        switch (payment?.status!) {
            case PaymentStatus.paid:
                paymentStatus = (
                    <View style={styles(theme).statusContainer}>
                        <SvgImage
                            name="Done"
                            size={SvgImageSize.xs}
                            color={theme.colors.secondary}
                        />
                        <Text medium caption style={styles(theme).statusText}>
                            {t('words.paid')}
                        </Text>
                    </View>
                )
                break
            case PaymentStatus.rejected:
                paymentStatus = (
                    <View style={styles(theme).statusContainer}>
                        <Text medium caption style={styles(theme).statusText}>
                            {t('words.rejected')}
                        </Text>
                    </View>
                )
                break
            case PaymentStatus.canceled:
                paymentStatus = (
                    <View style={styles(theme).statusContainer}>
                        <Text medium caption style={styles(theme).statusText}>
                            {t('words.canceled')}
                        </Text>
                    </View>
                )
                break
            case PaymentStatus.requested:
                paymentStatus = (
                    <Button
                        size="sm"
                        color={theme.colors.secondary}
                        containerStyle={styles(theme).buttonContainer}
                        onPress={onCancel}
                        title={
                            <Text medium caption>
                                {t('words.cancel')}
                            </Text>
                        }
                    />
                )
                break
            // Redemption in progess & status = accepted
            default:
                break
        }
        return paymentStatus
    }

    return (
        <View style={styles(theme).actionsContainer}>
            {renderPaymentStatus()}
        </View>
    )
}

type OutgoingPaymentRequestProps = {
    message: Message
    incomingPayment?: Payment
    text: string
}

const OutgoingPaymentRequest: React.FC<OutgoingPaymentRequestProps> = ({
    message,
    text,
}: OutgoingPaymentRequestProps) => {
    const { theme } = useTheme()
    const { sendDirectMessage } = useXmpp()
    const { state, dispatch } = useChatContext()

    const cancelPayment = () => {
        try {
            const canceledPaymentMessage = new Message({
                ...message,
                payment: {
                    ...message.payment,
                    updatedAt: Date.now() / 1000,
                    status: PaymentStatus.canceled,
                },
            })
            const withEncryptionKeys = state.encryptionKeys as Keypair
            const updatePayment = true
            sendDirectMessage(
                message.sentTo as Member,
                canceledPaymentMessage,
                withEncryptionKeys,
                updatePayment,
            )
            dispatch(updateMessage(canceledPaymentMessage))
        } catch (error) {
            console.log(error)
        }
    }

    return (
        <View style={styles(theme).container}>
            <Text caption medium style={styles(theme).messageText}>
                {text}
            </Text>
            <IncomingPaymentActions
                message={message}
                onCancel={cancelPayment}
            />
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            alignItems: 'flex-start',
        },
        actionsContainer: {
            flexDirection: 'row',
            justifyContent: 'flex-start',
            width: '100%',
            paddingVertical: theme.spacing.xs,
        },
        statusContainer: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        statusText: {
            color: theme.colors.secondary,
            marginLeft: theme.spacing.xs,
        },
        buttonContainer: {
            flex: 1,
            maxWidth: '50%',
        },
        messageText: {
            color: theme.colors.secondary,
            paddingBottom: theme.spacing.sm,
        },
    })

export default OutgoingPaymentRequest
