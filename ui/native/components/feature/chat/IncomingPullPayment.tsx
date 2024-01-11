import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { selectActiveFederation, updateChatPayment } from '@fedi/common/redux'
import {
    ChatMessage,
    ChatPayment,
    ChatPaymentStatus,
    MSats,
} from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'
import { makeLog } from '@fedi/common/utils/log'

import { fedimint } from '../../../bridge'
import { useEnvironmentContext } from '../../../state/contexts/EnvironmentContext'
import { useAppDispatch, useAppSelector } from '../../../state/hooks'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'

const log = makeLog('IncomingPullPayment')

type OutgoingPaymentActionsProps = {
    message: ChatMessage
    onReject: () => void
    onPay: () => void
    paymentProcessing: boolean
}

const OutgoingPaymentActions: React.FC<OutgoingPaymentActionsProps> = ({
    message,
    onReject,
    onPay,
    paymentProcessing,
}: OutgoingPaymentActionsProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { payment } = message

    const renderPaymentStatus = () => {
        if (paymentProcessing || !payment?.status) return <ActivityIndicator />

        let paymentStatus = (
            <View style={styles(theme).statusContainer}>
                <Text medium caption style={styles(theme).statusText}>
                    {t('words.pending')}
                </Text>
            </View>
        )

        switch (payment.status) {
            case ChatPaymentStatus.paid:
                paymentStatus = (
                    <View style={styles(theme).statusContainer}>
                        <SvgImage
                            name="Check"
                            size={SvgImageSize.xs}
                            color={theme.colors.secondary}
                        />
                        <Text medium caption style={styles(theme).statusText}>
                            {t('words.paid')}
                        </Text>
                    </View>
                )
                break
            case ChatPaymentStatus.rejected:
                paymentStatus = (
                    <View style={styles(theme).statusContainer}>
                        <Text medium caption style={styles(theme).statusText}>
                            {t('words.rejected')}
                        </Text>
                    </View>
                )
                break
            case ChatPaymentStatus.canceled:
                paymentStatus = (
                    <View style={styles(theme).statusContainer}>
                        <Text medium caption style={styles(theme).statusText}>
                            {t('words.canceled')}
                        </Text>
                    </View>
                )
                break
            case ChatPaymentStatus.requested:
                paymentStatus = (
                    <>
                        <Button
                            disabled={paymentProcessing}
                            size="sm"
                            color={theme.colors.secondary}
                            containerStyle={styles(theme).buttonContainer}
                            onPress={onReject}
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
                            onPress={onPay}
                            title={
                                <Text medium caption>
                                    {t('words.pay')}
                                </Text>
                            }
                        />
                    </>
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

type IncomingPullPaymentProps = {
    message: ChatMessage
    outgoingPayment?: ChatPayment
    text: string
}

const IncomingPullPayment: React.FC<IncomingPullPaymentProps> = ({
    message,
    text,
}: IncomingPullPaymentProps) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const { toast } = useEnvironmentContext().state
    const activeFederation = useAppSelector(selectActiveFederation)
    const [paymentProcessing, setPaymentProcessing] = useState<boolean>(false)

    const rejectPaymentRequest = async () => {
        try {
            await dispatch(
                updateChatPayment({
                    fedimint,
                    federationId: activeFederation?.id as string,
                    messageId: message.id,
                    action: 'reject',
                }),
            ).unwrap()
        } catch (error) {
            log.error('rejectPaymentRequest', error)
            toast?.show('errors.chat-payment-failed')
        }
    }

    // Process for sending a payment starts here
    const acceptPaymentRequest = async () => {
        if (!activeFederation || !message.payment) return

        if (activeFederation.balance < message.payment.amount) {
            toast?.show(
                t('errors.insufficient-balance', {
                    balance: `${amountUtils.formatNumber(
                        amountUtils.msatToSat(
                            activeFederation?.balance as MSats,
                        ),
                    )} SATS`,
                }),
                5000,
            )
        } else {
            setPaymentProcessing(true)
            try {
                await dispatch(
                    updateChatPayment({
                        fedimint,
                        federationId: activeFederation?.id as string,
                        messageId: message.id,
                        action: 'pay',
                    }),
                ).unwrap()
            } catch (err) {
                toast?.show('errors.chat-payment-failed')
            }
            setPaymentProcessing(false)
        }
    }

    return (
        <View style={styles(theme).container}>
            <Text caption medium style={styles(theme).messageText}>
                {text}
            </Text>
            <OutgoingPaymentActions
                message={message}
                onReject={rejectPaymentRequest}
                onPay={acceptPaymentRequest}
                paymentProcessing={paymentProcessing}
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

export default IncomingPullPayment
