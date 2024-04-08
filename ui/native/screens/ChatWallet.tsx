import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Text } from '@rneui/themed'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Keyboard, StyleSheet, View } from 'react-native'

import { useChatPaymentUtils } from '@fedi/common/hooks/chat'
import { selectMatrixDirectMessageRoom } from '@fedi/common/redux'
import { ChatType } from '@fedi/common/types'

import { fedimint } from '../bridge'
import { AmountScreen } from '../components/ui/AmountScreen'
import { useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'ChatWallet'>

const ChatWallet: React.FC<Props> = ({ navigation, route }: Props) => {
    const { t } = useTranslation()
    const { recipientId } = route.params
    const existingRoom = useAppSelector(s =>
        selectMatrixDirectMessageRoom(s, recipientId),
    )
    const [confirmingSend, setConfirmingSend] = useState(false)
    const {
        submitType,
        setSubmitType,
        submitAttempts,
        setSubmitAttempts,
        submitAction,
        amount,
        setAmount,
        inputMinMax,
        canSendAmount,
        handleSendPayment,
        handleRequestPayment,
    } = useChatPaymentUtils(t, fedimint, existingRoom?.id, recipientId)

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
    }, [existingRoom, navigation])

    const handleRequest = useCallback(async () => {
        handleRequestPayment(() => {
            // go back to DirectChat to show sent request
            backToChat()
        })
    }, [handleRequestPayment, backToChat])

    const handleConfirmSend = useCallback(async () => {
        handleSendPayment(() => {
            // go back to DirectChat to show sent payment
            backToChat()
        })
    }, [handleSendPayment, backToChat])

    const handleSend = async () => {
        setSubmitType('send')
        setSubmitAttempts(attempts => attempts + 1)
        if (!canSendAmount) return
        setConfirmingSend(true)
        Keyboard.dismiss()
    }

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
            isSubmitting={submitAction !== null}
            verb={submitType === 'send' ? t('words.send') : t('words.request')}
            {...inputMinMax}
            buttons={
                confirmingSend
                    ? [
                          {
                              title: t('feature.send.hold-to-confirm-send'),
                              onLongPress: handleConfirmSend,
                              disabled: submitAction === 'send',
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
                              disabled: submitAction === 'send',
                              loading: submitAction === 'request',
                          },
                          {
                              title: t('words.send'),
                              titleProps: {
                                  maxFontSizeMultiplier: 1.4,
                                  numberOfLines: 1,
                              },
                              onPress: handleSend,
                              disabled: submitAction === 'request',
                              loading: submitAction === 'send',
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
