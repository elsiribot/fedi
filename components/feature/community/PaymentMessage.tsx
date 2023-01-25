import { Button, Image, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect } from 'react'
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
import { MSats, Message, PaymentStatus } from '../../../types'
import amountUtils from '../../../utils/AmountUtils'

type PaymentMessageProps = {
    message: Message
}

const PaymentMessage: React.FC<PaymentMessageProps> = ({
    message,
}: PaymentMessageProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { generateEcash, receiveEcash, validateEcash } = useBridge()
    const { sendUpdatedPaymentMessage } = useXmpp()
    const { toast } = useEnvironmentContext().state
    const { selectedFederation } = useFederationsContext().state
    const { state, dispatch } = useCommunityContext()
    const { authenticatedMember } = state
    const { payment } = message

    const sentByMe = message.sentBy?.username === authenticatedMember?.username

    const text = sentByMe
        ? `${t('feature.community.outgoing-chat-payment', {
              amount: amountUtils.formatNumber(
                  amountUtils.msatToSat(payment?.amount as MSats),
              ),
              unit: 'SATS',
              name: message.sentBy?.username,
              memo: payment?.memo,
          })}`
        : `${t('feature.community.incoming-chat-payment', {
              amount: amountUtils.formatNumber(
                  amountUtils.msatToSat(payment?.amount as MSats),
              ),
              unit: 'SATS',
              name: message.sentBy?.username,
              memo: payment?.memo,
          })}`

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

    const acceptIncomingPaymentRequest = async () => {
        try {
            if (selectedFederation?.balance! < message.payment?.amount!) {
                toast?.show(
                    t('errors.insufficient-balance', {
                        balance: `${amountUtils.formatNumber(
                            amountUtils.msatToSat(
                                selectedFederation?.balance as MSats,
                            ),
                        )} SATS`,
                    }),
                    5000,
                )
                return
            }
            const ecash = await generateEcash(message.payment?.amount as MSats)
            const acceptedPaymentMessage = new Message({
                ...message,
                payment: {
                    ...message.payment,
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
            console.log(error)
        }
    }

    // Redeem ecash if found in incoming message
    useEffect(() => {
        const redeemEcash = async (ecash: string) => {
            try {
                const { valid, amount } = await validateEcash(ecash)
                console.debug('valid', valid)
                if (valid) {
                    console.debug('receiving ecash', amount, 'msats')
                    await receiveEcash(ecash)
                    const acceptedPaymentMessage = new Message({
                        ...message,
                        payment: {
                            ...message.payment,
                            status: PaymentStatus.paid,
                            token: 'spent',
                        },
                    })
                    sendUpdatedPaymentMessage({
                        to: message.sentTo,
                        message: acceptedPaymentMessage,
                    })
                    dispatch(updateMessage(acceptedPaymentMessage))
                }
            } catch (error) {
                console.log(error)
            }
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
        dispatch,
        message.payment,
        authenticatedMember?.username,
        validateEcash,
        receiveEcash,
        message,
        sendUpdatedPaymentMessage,
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
