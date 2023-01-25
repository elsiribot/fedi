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
import { Message, Payment, PaymentStatus } from '../../../types'

type IncomingPaymentActionsProps = {
    message: Message
    paymentStatus: PaymentStatus
}

const IncomingPaymentActions: React.FC<IncomingPaymentActionsProps> = ({
    message,
    paymentStatus,
}: OutgoingPaymentRequestProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { receiveEcash, validateEcash } = useBridge()
    const { sendUpdatedPaymentMessage } = useXmpp()
    const { toast } = useEnvironmentContext().state
    const { selectedFederation } = useFederationsContext().state
    const { state, dispatch } = useCommunityContext()
    const { authenticatedMember } = state
    const [tokenWasSpent, setTokenWasSpent] = useState<boolean>(false)
    const [redemptionProcessing, setRedemptionProcessing] =
        useState<boolean>(false)
    const { payment, sentBy } = message

    const cancelPayment = () => {
        try {
            const canceledPaymentMessage = new Message({
                ...message,
                payment: {
                    ...message?.payment,
                    status: PaymentStatus.canceled,
                },
            })
            sendUpdatedPaymentMessage({
                to: message?.sentTo,
                message: canceledPaymentMessage,
            })
            dispatch(updateMessage(canceledPaymentMessage))
        } catch (error) {
            console.log(error)
        }
    }

    // When paymentProcessing begins, ...

    const updateAndBroadcastSpentPayment = useCallback(async () => {
        const acceptedPaymentMessage = new Message({
            ...message,
            payment: {
                ...payment,
                status: PaymentStatus.paid,
                token: null,
            },
        })
        sendUpdatedPaymentMessage({
            to: sentBy,
            message: acceptedPaymentMessage,
        })
        dispatch(updateMessage(acceptedPaymentMessage))
    }, [dispatch, message, payment, sendUpdatedPaymentMessage, sentBy])

    const redeemEcash = useCallback(async () => {
        try {
            const { valid, amount } = await validateEcash(payment?.token!)
            console.debug('redeemEcash: valid:', valid)
            if (valid) {
                console.debug('receiving ecash', amount, 'msats')
                await receiveEcash(payment?.token!)
                updateAndBroadcastSpentPayment()
            }
        } catch (error) {
            console.log(error)
        }
    }, [
        payment?.token,
        receiveEcash,
        updateAndBroadcastSpentPayment,
        validateEcash,
    ])

    useEffect(() => {
        if (redemptionProcessing === true) {
            redeemEcash(payment?.token!)
        }
    }, [redeemEcash, redemptionProcessing])

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

        if (payment?.token && payment?.status) {
            checkForSpentToken(payment?.token)
        }

        if (payment?.token && payment?.status !== PaymentStatus.paid) {
            console.debug('redeeming ecash', payment?.token)
            setRedemptionProcessing(true)
        }
    }, [
        payment,
        authenticatedMember?.username,
        validateEcash,
        receiveEcash,
        message,
        updateAndBroadcastSpentPayment,
    ])

    return (
        <View style={styles(theme).actionsContainer}>
            {paymentStatus === PaymentStatus.paid && (
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
            {paymentStatus === PaymentStatus.rejected && (
                <View style={styles(theme).statusContainer}>
                    <Text medium caption style={styles(theme).statusText}>
                        {t('words.rejected')}
                    </Text>
                </View>
            )}
            {paymentStatus === PaymentStatus.canceled && (
                <View style={styles(theme).statusContainer}>
                    <Text medium caption style={styles(theme).statusText}>
                        {t('words.canceled')}
                    </Text>
                </View>
            )}
            {paymentStatus === PaymentStatus.requested && (
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
            )}
        </View>
    )
}

type OutgoingPaymentRequestProps = {
    message: Message
    incomingPayment: Payment
    text: string
}

const OutgoingPaymentRequest: React.FC<OutgoingPaymentRequestProps> = ({
    message,
    incomingPayment,
    text,
}: OutgoingPaymentRequestProps) => {
    const { theme } = useTheme()

    return (
        <View style={styles(theme).container}>
            <Text caption medium style={styles(theme).messageText}>
                {text}
            </Text>
            <IncomingPaymentActions message={message} />
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

export default OutgoingPaymentRequest
