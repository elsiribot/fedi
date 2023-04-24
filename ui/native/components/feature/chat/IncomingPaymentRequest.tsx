import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { selectActiveFederation } from '@fedi/common/redux'
import amountUtils from '@fedi/common/utils/AmountUtils'

import {
    updateMessage,
    useChatContext,
} from '../../../state/contexts/ChatContext'
import { useEnvironmentContext } from '../../../state/contexts/EnvironmentContext'
import { useAppSelector, useBridge } from '../../../state/hooks'
import { useXmpp } from '../../../state/hooks/chat'
import {
    Member,
    Message,
    MSats,
    Payment,
    PaymentStatus,
    Keypair,
} from '../../../types'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'

type OutgoingPaymentActionsProps = {
    message: Message
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
        if (paymentProcessing) return <ActivityIndicator />
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

type IncomingPaymentRequestProps = {
    message: Message
    outgoingPayment?: Payment
    text: string
}

const IncomingPaymentRequest: React.FC<IncomingPaymentRequestProps> = ({
    message,
    text,
}: IncomingPaymentRequestProps) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const { generateEcash } = useBridge()
    const { sendDirectMessage } = useXmpp()
    const { toast } = useEnvironmentContext().state
    const activeFederation = useAppSelector(selectActiveFederation)
    const { state, dispatch } = useChatContext()
    const [paymentProcessing, setPaymentProcessing] = useState<boolean>(false)
    const [generatedEcashToken, setGeneratedEcashToken] = useState<string>('')

    const rejectPaymentRequest = () => {
        try {
            const rejectedPaymentMessage = new Message({
                ...message,
                payment: {
                    ...message.payment,
                    updatedAt: Date.now() / 1000,
                    status: PaymentStatus.rejected,
                },
            })
            const withEncryptionKeys = state.encryptionKeys as Keypair
            const updatePayment = true
            sendDirectMessage(
                message.sentBy as Member,
                rejectedPaymentMessage,
                withEncryptionKeys,
                updatePayment,
            )
            dispatch(updateMessage(rejectedPaymentMessage))
        } catch (error) {
            console.log(error)
        }
    }

    // Process for sending a payment starts here
    const acceptPaymentRequest = async () => {
        if (activeFederation?.balance! < message.payment?.amount!) {
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
            throw new Error('errors.insufficient-balance')
        } else {
            setPaymentProcessing(true)
        }
    }

    // When paymentProcessing begins, we generate and send ecash
    useEffect(() => {
        const generateAndSendEcash = async () => {
            try {
                const ecash = await generateEcash(
                    message.payment?.amount as MSats,
                )
                setGeneratedEcashToken(ecash)
            } catch (error) {
                console.error(error)
                toast?.show(t('errors.unknown-error'), 3000)
                // Reset the action buttons here to try again
                setPaymentProcessing(false)
            }
        }

        if (paymentProcessing === true) {
            generateAndSendEcash()
        }
    }, [
        dispatch,
        generateEcash,
        paymentProcessing,
        message.payment?.amount,
        toast,
        t,
    ])

    useEffect(() => {
        const prepareAndSendPayment = async () => {
            try {
                const acceptedPaymentMessage = new Message({
                    ...message,
                    payment: {
                        ...message.payment,
                        // sender of the payment request should be the recipient
                        // here...  need to refactor for sender-initiated payments
                        recipient: message.sentBy,
                        updatedAt: Date.now() / 1000,
                        status: PaymentStatus.accepted,
                        token: generatedEcashToken,
                    },
                })
                setGeneratedEcashToken('')
                dispatch(updateMessage(acceptedPaymentMessage))
                const withEncryptionKeys = state.encryptionKeys as Keypair
                const updatePayment = true
                sendDirectMessage(
                    message.sentBy as Member,
                    acceptedPaymentMessage,
                    withEncryptionKeys,
                    updatePayment,
                )
                // Once the token has been generated and sent in a message
                // we wait for the recipient to redeem the ecash and send
                // back a message with the payment.status set to 'paid'
                //
                // however, if the recipient is not online, we set a 5s timeout
                // here so that we at least show the sender a pending state
                // which should update to paid in the useEffect below
                // as soon as we get the confirmation message...
                setTimeout(() => {
                    setPaymentProcessing(false)
                }, 5000)
            } catch (error) {
                console.error(error)
            }
        }
        if (generatedEcashToken) {
            prepareAndSendPayment()
        }
    }, [
        dispatch,
        generatedEcashToken,
        message,
        sendDirectMessage,
        state.encryptionKeys,
    ])

    useEffect(() => {
        if (message.payment?.status === PaymentStatus.paid) {
            setPaymentProcessing(false)
        }
    }, [message.payment?.status])

    // TODO: if a payment has a token & a Rebroadcast a payment
    // useEffect(() => {
    //     if (payment?.token && payment?.status === PaymentStatus.accepted) {
    //     }
    // }, [])

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

export default IncomingPaymentRequest
