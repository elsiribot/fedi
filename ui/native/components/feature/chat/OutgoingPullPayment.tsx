import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { updateChatPayment } from '@fedi/common/redux'
import { ChatMessage, ChatPayment, ChatPaymentStatus } from '@fedi/common/types'

import { fedimint } from '../../../bridge'
import { useAppDispatch, useAppSelector } from '../../../state/hooks'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'

type IncomingPaymentActionsProps = {
    message: ChatMessage
    onCancel: () => void
}

const IncomingPaymentActions: React.FC<IncomingPaymentActionsProps> = ({
    message,
    onCancel,
}: IncomingPaymentActionsProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const dispatch = useAppDispatch()
    const activeFederationId = useAppSelector(
        s => s.federation.activeFederationId,
    )
    const [processingRedemption, setProcessingRedemption] =
        useState<boolean>(false)
    const { payment } = message

    // Check for valid ecash if found in incoming message
    useEffect(() => {
        const dispatchPaymentUpdate = async () => {
            try {
                setProcessingRedemption(true)
                await dispatch(
                    updateChatPayment({
                        fedimint,
                        federationId: activeFederationId as string,
                        messageId: message.id,
                        action: 'receive',
                    }),
                ).unwrap()
            } catch (error) {
                console.error('dispatchPaymentUpdate', error)
            }
            setProcessingRedemption(false)
        }
        if (payment?.token) {
            dispatchPaymentUpdate()
        }
    }, [activeFederationId, dispatch, message.id, payment?.token])

    const renderPaymentStatus = () => {
        let paymentStatus = (
            <View style={styles(theme).statusContainer}>
                <Text medium caption style={styles(theme).statusText}>
                    {t('words.pending')}
                </Text>
            </View>
        )
        if (processingRedemption) return paymentStatus

        switch (payment?.status!) {
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

type OutgoingPullPaymentProps = {
    message: ChatMessage
    incomingPayment?: ChatPayment
    text: string
}

const OutgoingPullPayment: React.FC<OutgoingPullPaymentProps> = ({
    message,
    text,
}: OutgoingPullPaymentProps) => {
    const { theme } = useTheme()
    const dispatch = useAppDispatch()
    const activeFederationId = useAppSelector(
        s => s.federation.activeFederationId,
    )

    const cancelPayment = async () => {
        try {
            await dispatch(
                updateChatPayment({
                    fedimint,
                    federationId: activeFederationId as string,
                    messageId: message.id,
                    action: 'cancel',
                }),
            ).unwrap()
        } catch (error) {
            console.error(error)
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

export default OutgoingPullPayment
