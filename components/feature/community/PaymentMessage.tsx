import { Button, Image, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { Images } from '../../../assets/images'
import {
    updateMessage,
    useCommunityContext,
} from '../../../state/contexts/CommunityContext'
import { useXmpp } from '../../../state/hooks'
import { Message, MSats, PaymentStatus } from '../../../types'
import amountUtils from '../../../utils/AmountUtils'

type PaymentMessageProps = {
    message: Message
}

const PaymentMessage: React.FC<PaymentMessageProps> = ({
    message,
}: PaymentMessageProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { sendCancelPaymentMessage } = useXmpp()
    const { state, dispatch } = useCommunityContext()
    const { authenticatedMember } = state
    const { payment } = message

    const sentByMe = message.sentBy?.username === authenticatedMember?.username

    const text = sentByMe
        ? `${t('feature.community.outgoing-chat-payment', {
              amount: amountUtils.msatToSat(payment?.amount as MSats),
              unit: 'SATS',
              name: message.sentBy?.username,
              memo: payment?.memo,
          })}`
        : `${t('feature.community.incoming-chat-payment', {
              amount: amountUtils.msatToSat(payment?.amount as MSats),
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
            sendCancelPaymentMessage({
                to: message.sentTo,
                message: canceledPaymentMessage,
            })
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
