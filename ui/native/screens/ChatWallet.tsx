import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Text } from '@rneui/themed'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Keyboard, StyleSheet, View } from 'react-native'

import {
    useMinMaxRequestAmount,
    useMinMaxSendAmount,
} from '@fedi/common/hooks/amount'
import { useToast } from '@fedi/common/hooks/toast'
import {
    selectActiveFederationId,
    selectMatrixDirectMessageRoom,
    sendMatrixPaymentPush,
    sendMatrixPaymentRequest,
} from '@fedi/common/redux'
import { ChatType, Sats } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'
import { makeLog } from '@fedi/common/utils/log'

import { fedimint } from '../bridge'
import { AmountScreen } from '../components/ui/AmountScreen'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

const log = makeLog('ChatWallet')

export type Props = NativeStackScreenProps<RootStackParamList, 'ChatWallet'>

const ChatWallet: React.FC<Props> = ({ navigation, route }: Props) => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const federationId = useAppSelector(selectActiveFederationId)
    const sendMinMax = useMinMaxSendAmount()
    const requestMinMax = useMinMaxRequestAmount({ ecashRequest: {} })

    const [confirmingSend, setConfirmingSend] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [amount, setAmount] = useState(0 as Sats)

    const [submitAttempts, setSubmitAttempts] = useState(0)
    const [submitType, setSubmitType] = useState<'send' | 'request'>()
    const toast = useToast()
    const { recipientId } = route.params
    const existingRoom = useAppSelector(s =>
        selectMatrixDirectMessageRoom(s, recipientId),
    )

    // Reset navigation stack on going back to the chat to give better back
    // button behavior if directed here from Omni.
    const backToChat = useCallback(() => {
        if (!existingRoom) return
        navigation.reset({
            index: 1,
            routes: [
                { name: 'TabsNavigator', params: { initialRouteName: 'Chat' } },
                {
                    name: 'ChatRoomConversation',
                    params: {
                        roomId: existingRoom.id,
                        chatType: ChatType.direct,
                    },
                },
            ],
        })
    }, [navigation, recipientId, existingRoom?.id])

    const handleRequest = useCallback(async () => {
        // TODO: allow for on-the-fly room creation?
        if (!federationId || !existingRoom) return
        setSubmitType('request')
        setSubmitAttempts(attempts => attempts + 1)
        if (
            amount < requestMinMax.minimumAmount ||
            amount > requestMinMax.maximumAmount
        ) {
            return
        }

        setSubmitType('request')
        try {
            setIsLoading(true)
            await dispatch(
                sendMatrixPaymentRequest({
                    fedimint,
                    federationId,
                    roomId: existingRoom?.id,
                    amount: amountUtils.satToMsat(amount),
                }),
            ).unwrap()
            // go back to DirectChat to show sent request
            backToChat()
        } catch (error) {
            log.error('requestEcash', error)
            toast.error(t, error)
        }
        setIsLoading(false)
    }, [
        federationId,
        amount,
        requestMinMax.minimumAmount,
        requestMinMax.maximumAmount,
        dispatch,
        existingRoom?.id,
        toast,
        t,
    ])

    const handleConfirmSend = useCallback(async () => {
        // TODO: allow for on-the-fly room creation?
        if (!federationId || !existingRoom) return
        try {
            setIsLoading(true)
            await dispatch(
                sendMatrixPaymentPush({
                    fedimint,
                    federationId,
                    roomId: existingRoom?.id,
                    recipientId,
                    amount: amountUtils.satToMsat(amount),
                }),
            ).unwrap()
            // go back to DirectChat to show sent payment
            backToChat()
        } catch (error) {
            log.error('generateAndSendEcash', error)
            toast.error(t, error)
        }
        setIsLoading(false)
    }, [federationId, amount, dispatch, existingRoom?.id, toast, t])

    const handleSend = async () => {
        setSubmitType('send')
        setSubmitAttempts(attempts => attempts + 1)
        if (
            amount < sendMinMax.minimumAmount ||
            amount > sendMinMax.maximumAmount
        ) {
            return
        }

        setSubmitType('send')
        setConfirmingSend(true)
        Keyboard.dismiss()
    }

    const inputMinMax =
        submitType === 'send'
            ? sendMinMax
            : submitType === 'request'
            ? requestMinMax
            : {}

    if (!existingRoom) {
        return (
            <View style={styles().centeredContainer}>
                <Text style={styles().centeredText}>
                    {t('errors.chat-member-not-found')}
                </Text>
            </View>
        )
    }

    return (
        <AmountScreen
            showBalance
            amount={amount}
            onChangeAmount={setAmount}
            submitAttempts={submitAttempts}
            isSubmitting={isLoading}
            verb={submitType === 'send' ? t('words.send') : t('words.request')}
            {...inputMinMax}
            buttons={
                confirmingSend
                    ? [
                          {
                              title: t('feature.send.hold-to-confirm-send'),
                              onLongPress: handleConfirmSend,
                              disabled: isLoading,
                          },
                      ]
                    : [
                          {
                              title: t('words.request'),
                              titleProps: {
                                  maxFontSizeMultiplier: 1.4,
                                  numberOfLines: 1,
                              },
                              onPress: handleRequest,
                              disabled: submitType === 'send',
                              loading: isLoading && submitType === 'request',
                          },
                          {
                              title: t('words.send'),
                              titleProps: {
                                  maxFontSizeMultiplier: 1.4,
                                  numberOfLines: 1,
                              },
                              onPress: handleSend,
                              disabled: submitType === 'request',
                              loading: isLoading && submitType === 'send',
                          },
                      ]
            }
        />
    )
}

const styles = () =>
    StyleSheet.create({
        centeredContainer: {
            flex: 1,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
        },
        centeredText: {
            textAlign: 'center',
        },
    })

export default ChatWallet
