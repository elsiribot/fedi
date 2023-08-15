import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Keyboard, StyleSheet, View } from 'react-native'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'

import {
    useMinMaxRequestAmount,
    useMinMaxSendAmount,
} from '@fedi/common/hooks/amount'
import {
    selectActiveFederation,
    selectAuthenticatedMember,
    selectMaxReceiveAmount,
    sendDirectMessage,
} from '@fedi/common/redux'
import { ChatPayment, ChatPaymentStatus, MSats, Sats } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'

import { fedimint } from '../bridge'
import AmountInput from '../components/ui/AmountInput'
import KeyboardAwareWrapper from '../components/ui/KeyboardAwareWrapper'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppDispatch, useAppSelector, useBridge } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'ChatWallet'>

const ChatWallet: React.FC<Props> = ({ navigation, route }: Props) => {
    const insets = useSafeAreaInsets()
    const { t } = useTranslation()
    const { theme } = useTheme()
    const dispatch = useAppDispatch()
    const activeFederation = useAppSelector(selectActiveFederation)
    const authenticatedMember = useAppSelector(selectAuthenticatedMember)
    const maxReceiveAmount = useAppSelector(selectMaxReceiveAmount)
    const [confirmingSend, setConfirmingSend] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [sendingEcash, setSendingEcash] = useState(false)
    const [amount, setAmount] = useState(0 as Sats)
    const [submitAttempts, setSubmitAttempts] = useState(0)
    const [submitType, setSubmitType] = useState<'send' | 'request'>()
    const { generateEcash } = useBridge()
    const { toast } = useEnvironmentContext().state
    const { recipientId } = route.params
    const sendMinMax = useMinMaxSendAmount()
    const requestMinMax = useMinMaxRequestAmount()

    useEffect(() => {
        const generateAndSendEcash = async () => {
            try {
                const millis = amountUtils.satToMsat(Number(amount) as Sats)
                const ecash = await generateEcash(millis as MSats)
                const payment: ChatPayment = {
                    amount: millis,
                    recipient: recipientId,
                    status: ChatPaymentStatus.accepted,
                    token: ecash,
                }
                dispatch(
                    sendDirectMessage({
                        fedimint,
                        federationId: activeFederation?.id as string,
                        recipientId: recipientId,
                        payment,
                    }),
                )
                // go back to DirectChat to show sent payment
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
        activeFederation?.id,
        amount,
        dispatch,
        generateEcash,
        navigation,
        recipientId,
        sendingEcash,
        t,
        toast,
    ])

    const requestEcash = async () => {
        setSubmitType('request')
        setSubmitAttempts(attempts => attempts + 1)
        if (
            amount < requestMinMax.minimumAmount ||
            amount > requestMinMax.maximumAmount
        ) {
            return
        }

        try {
            setIsLoading(true)
            const millis = amountUtils.satToMsat(Number(amount) as Sats)
            const payment: ChatPayment = {
                amount: millis,
                // I am the recipient since this is a pull payment
                recipient: authenticatedMember?.id,
                status: ChatPaymentStatus.requested,
            }
            dispatch(
                sendDirectMessage({
                    fedimint,
                    federationId: activeFederation?.id as string,
                    recipientId: recipientId,
                    payment,
                }),
            )
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
        setSubmitType('send')
        setSubmitAttempts(attempts => attempts + 1)
        if (
            amount < sendMinMax.minimumAmount ||
            amount > sendMinMax.maximumAmount
        ) {
            return
        }

        setConfirmingSend(true)
        Keyboard.dismiss()
    }

    const onChangeAmount = (updatedValue: Sats) => {
        if (maxReceiveAmount > -1 && updatedValue > maxReceiveAmount) {
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

    const inputMinMax =
        submitType === 'send'
            ? sendMinMax
            : submitType === 'request'
            ? requestMinMax
            : {}

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
                        submitAttempts={submitAttempts}
                        verb={
                            submitType === 'send'
                                ? t('words.send')
                                : t('words.request')
                        }
                        {...inputMinMax}
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
                            disabled={sendingEcash || isLoading}
                        />
                    ) : (
                        <>
                            <Button
                                title={t('words.request')}
                                onPress={requestEcash}
                                disabled={isLoading}
                                loading={isLoading && submitType === 'request'}
                                containerStyle={
                                    styles(theme, insets).buttonContainer
                                }
                            />
                            <Button
                                title={t('words.send')}
                                onPress={handleSend}
                                disabled={isLoading}
                                loading={isLoading && submitType === 'send'}
                                containerStyle={
                                    styles(theme, insets).buttonContainer
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
