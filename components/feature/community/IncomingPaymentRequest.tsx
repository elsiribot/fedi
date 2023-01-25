import { Button, Image, Text, Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { Images } from '../../../assets/images'
import {
    updateMessage,
    useCommunityContext,
} from '../../../state/contexts/CommunityContext'
import { useEnvironmentContext } from '../../../state/contexts/EnvironmentContext'
import { useFederationsContext } from '../../../state/contexts/FederationsContext'
import { useBridge, useXmpp } from '../../../state/hooks'
import { Message, MSats, Payment, PaymentStatus } from '../../../types'
import amountUtils from '../../../utils/AmountUtils'
import OutgoingPaymentRequest from './OutgoingPaymentRequest'

type IncomingPaymentRequestProps = {
    outgoingPayment: Payment
}

const IncomingPaymentRequest: React.FC<IncomingPaymentRequestProps> = ({
    outgoingPayment,
}: IncomingPaymentRequestProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { generateEcash, receiveEcash, validateEcash } = useBridge()
    const { sendUpdatedPaymentMessage } = useXmpp()
    const { toast } = useEnvironmentContext().state
    const { selectedFederation } = useFederationsContext().state
    const { state, dispatch } = useCommunityContext()
    const { authenticatedMember } = state
    const [tokenWasSpent, setTokenWasSpent] = useState<boolean>(false)
    const [paymentProcessing, setPaymentProcessing] = useState<boolean>(false)
    const { payment } = message

    const sentByMe = message.sentBy?.username === authenticatedMember?.username

    // This is for receiver-initated payments so (counter-intuitively) if the
    // message (payment request) was sent by me, then I am the receiver
    // of the payment itself which would be INCOMING...
    if (sentByMe) {
        return (
            <OutgoingPaymentRequest
                incomingPayment={message.payment}
                text={`${t('feature.community.outgoing-chat-payment', {
                    amount: amountUtils.msatToSat(payment?.amount as MSats),
                    unit: 'SATS',
                    name: message.sentBy?.username,
                    memo: payment?.memo,
                })}`}
            />
        )
    } else {
        return (
            <IncomingPaymentRequest
                outgoingPayment={message.payment}
                text={`${t('feature.community.incoming-chat-payment', {
                    amount: amountUtils.msatToSat(payment?.amount as MSats),
                    unit: 'SATS',
                    name: message.sentBy?.username,
                    memo: payment?.memo,
                })}`}
            />
        )
    }

    const cancelPayment = () => {
        try {
            const canceledPaymentMessage = new Message({
                ...message,
                payment: {
                    ...message.payment,
                    status: PaymentStatus.canceled,
                },
            })
            sendUpdatedPaymentMessage({
                to: message.sentTo,
                message: canceledPaymentMessage,
            })
            dispatch(updateMessage(canceledPaymentMessage))
        } catch (error) {
            console.log(error)
        }
    }

    const rejectIncomingPaymentRequest = () => {
        try {
            const rejectedPaymentMessage = new Message({
                ...message,
                payment: {
                    ...message.payment,
                    status: PaymentStatus.rejected,
                },
            })
            sendUpdatedPaymentMessage({
                to: message.sentBy,
                message: rejectedPaymentMessage,
            })
            dispatch(updateMessage(rejectedPaymentMessage))
        } catch (error) {
            console.log(error)
        }
    }

    // Process for sending a payment starts here
    const acceptIncomingPaymentRequest = async () => {
        try {
            if (selectedFederation?.balance! < message.payment?.amount!) {
                toast?.show(
                    t('errors.insufficient-balance', {
                        balance: `${amountUtils.msatToSat(
                            selectedFederation?.balance as MSats,
                        )} SATS`,
                    }),
                    5000,
                )
                throw new Error('errors.insufficient-balance')
            }
            setPaymentProcessing(true)
        } catch (error) {
            console.log(error)
        }
    }

    const generateAndSendEcash = useCallback(async () => {
        try {
            const ecash = await generateEcash(message.payment?.amount as MSats)
            const acceptedPaymentMessage = new Message({
                ...message,
                payment: {
                    ...message.payment,
                    // sender of the payment request should be the recipient
                    // here...  need to refactor for sender-initiated payments
                    status: PaymentStatus.accepted,
                    recipient: message.sentBy,
                    token: ecash,
                },
            })
            sendUpdatedPaymentMessage({
                to: message.sentBy,
                message: acceptedPaymentMessage,
            })
            dispatch(updateMessage(acceptedPaymentMessage))
        } catch (error) {
            console.error(error)
        }
        setPaymentProcessing(false)
    }, [dispatch, generateEcash, message, sendUpdatedPaymentMessage])

    // When paymentProcessing begins, we generate and send ecash
    useEffect(() => {
        if (paymentProcessing === true) {
            generateAndSendEcash()
        }
    }, [generateAndSendEcash, paymentProcessing])

    const updateAndBroadcastSpentPayment = useCallback(async () => {
        const acceptedPaymentMessage = new Message({
            ...message,
            payment: {
                ...message.payment,
                status: PaymentStatus.paid,
                token: null,
            },
        })
        sendUpdatedPaymentMessage({
            to: message.sentTo,
            message: acceptedPaymentMessage,
        })
        dispatch(updateMessage(acceptedPaymentMessage))
    }, [dispatch, message, sendUpdatedPaymentMessage])

    useEffect(() => {
        if (tokenWasSpent === true) {
            updateAndBroadcastSpentPayment()
        }
    }, [tokenWasSpent, updateAndBroadcastSpentPayment])

    // Redeem ecash if found in incoming message
    useEffect(() => {
        const checkForSpentToken = async (ecash: string) => {
            const { valid } = await validateEcash(ecash)
            console.debug('checkForSpentToken: valid:', valid)
            if (!valid) {
                setTokenWasSpent(true)
            }
        }

        const redeemEcash = async (ecash: string) => {
            try {
                const { valid, amount } = await validateEcash(ecash)
                console.debug('redeemEcash: valid:', valid)
                if (valid) {
                    console.debug('receiving ecash', amount, 'msats')
                    await receiveEcash(ecash)
                    updateAndBroadcastSpentPayment()
                }
            } catch (error) {
                console.log(error)
            }
        }

        if (message.payment?.token && message.payment?.status) {
            checkForSpentToken(message.payment?.token)
        }

        if (
            message.payment?.token &&
            message.payment?.token !== 'spent' &&
            message.payment?.status !== PaymentStatus.paid &&
            message.payment?.recipient?.username ===
                authenticatedMember?.username
        ) {
            console.debug('redeeming ecash', message.payment?.token)
            redeemEcash(message.payment?.token)
        }
    }, [
        message.payment,
        authenticatedMember?.username,
        validateEcash,
        receiveEcash,
        message,
        updateAndBroadcastSpentPayment,
    ])

    return (
        <View style={styles(theme).container}>
            <Text caption medium style={styles(theme).messageText}>
                {text}
            </Text>
            <View style={styles(theme).actionsContainer}>
                {payment?.status === PaymentStatus.paid && (
                    <View style={styles(theme).statusContainer}>
                        <Image
                            source={Images.DoneWhite}
                            style={styles(theme).paidIcon}
                        />
                        <Text medium caption style={styles(theme).statusText}>
                            {t('words.paid')}
                        </Text>
                    </View>
                )}
                {payment?.status === PaymentStatus.rejected && (
                    <View style={styles(theme).statusContainer}>
                        <Text medium caption style={styles(theme).statusText}>
                            {t('words.rejected')}
                        </Text>
                    </View>
                )}
                {payment?.status === PaymentStatus.canceled && (
                    <View style={styles(theme).statusContainer}>
                        <Text medium caption style={styles(theme).statusText}>
                            {t('words.canceled')}
                        </Text>
                    </View>
                )}
                {payment?.status === PaymentStatus.requested &&
                    (sentByMe ? (
                        <Button
                            size="sm"
                            color={theme.colors.secondary}
                            containerStyle={styles(theme).buttonContainer}
                            onPress={cancelPayment}
                            title={
                                <Text medium caption>
                                    {t('words.cancel')}
                                </Text>
                            }
                        />
                    ) : (
                        <>
                            <Button
                                disabled={paymentProcessing}
                                size="sm"
                                color={theme.colors.secondary}
                                containerStyle={styles(theme).buttonContainer}
                                onPress={rejectIncomingPaymentRequest}
                                title={
                                    <Text medium caption>
                                        {t('words.reject')}
                                    </Text>
                                }
                            />
                            <Text>&nbsp;&nbsp;</Text>
                            <Button
                                disabled={paymentProcessing}
                                size="sm"
                                color={theme.colors.secondary}
                                containerStyle={styles(theme).buttonContainer}
                                onPress={acceptIncomingPaymentRequest}
                                title={
                                    <Text medium caption>
                                        {t('words.pay')}
                                    </Text>
                                }
                            />
                        </>
                    ))}
            </View>
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
        paidIcon: {
            height: theme.sizes.xs,
            width: theme.sizes.xs,
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
        paymentActionsButtonText: {
            color: theme.colors.primary,
        },
    })

export default PaymentMessage
