import { Input, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    Insets,
    Keyboard,
    KeyboardEvent,
    Platform,
    Pressable,
    StyleSheet,
    View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { selectWebsocketIsHealthy } from '@fedi/common/redux'
import { formatErrorMessage } from '@fedi/common/utils/format'

import { useEnvironmentContext } from '../../../state/contexts/EnvironmentContext'
import { useAppSelector } from '../../../state/hooks'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'
import ChatWalletButton from './ChatWalletButton'

type MessageInputProps = {
    onMessageSubmitted: (message: string) => Promise<void>
    memberId?: string | undefined
}

const MessageInput: React.FC<MessageInputProps> = ({
    onMessageSubmitted,
    memberId, // should only defined for DirectChat
}: MessageInputProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const insets = useSafeAreaInsets()

    const { toast } = useEnvironmentContext().state
    const websocketIsHealthy = useAppSelector(selectWebsocketIsHealthy)
    const [messageText, setMessageText] = useState<string>('')
    const [inputHeight, setInputHeight] = useState<number>(
        theme.sizes.minMessageInputHeight,
    )
    const [keyboardHeight, setKeyboardHeight] = useState<number>(0)
    const [isSending, setIsSending] = useState(false)

    useEffect(() => {
        const keyboardShownListener = Keyboard.addListener(
            'keyboardWillShow',
            (e: KeyboardEvent) => {
                console.info(e.endCoordinates)
                setKeyboardHeight(e.endCoordinates.height)
            },
        )
        const keyboardHiddenListener = Keyboard.addListener(
            'keyboardWillHide',
            () => {
                setKeyboardHeight(0)
            },
        )

        return () => {
            keyboardShownListener.remove()
            keyboardHiddenListener.remove()
        }
    }, [])

    const handleSend = async () => {
        if (!messageText) return
        if (websocketIsHealthy === false) {
            toast?.show(t('errors.chat-connection-unhealthy'), 5000)
            return
        }
        setIsSending(true)
        try {
            await onMessageSubmitted(messageText)
            setMessageText('')
        } catch (err) {
            toast?.show(
                formatErrorMessage(t, err, 'errors.chat-unavailable'),
                5000,
            )
        }
        setIsSending(false)
    }

    const style = styles(theme, insets)
    return (
        <View
            style={[
                style.container,
                keyboardHeight > 0 && Platform.OS === 'ios'
                    ? { paddingBottom: keyboardHeight + theme.spacing.lg }
                    : {},
            ]}>
            {/* in-chat payments only available for DirectChat */}
            {memberId && <ChatWalletButton memberId={memberId} />}
            <Input
                onChangeText={setMessageText}
                value={messageText}
                placeholder={`${t('words.message')}`}
                returnKeyType="next"
                onContentSizeChange={({
                    nativeEvent: {
                        contentSize: { height },
                    },
                }) => {
                    if (height > inputHeight) {
                        setInputHeight(
                            Math.min(theme.sizes.maxMessageInputHeight, height),
                        )
                    } else if (height < inputHeight) {
                        setInputHeight(
                            Math.max(theme.sizes.minMessageInputHeight, height),
                        )
                    }
                }}
                containerStyle={[style.textInputOuter, { height: inputHeight }]}
                inputContainerStyle={style.textInputInner}
                inputStyle={isSending ? style.textInputDisabled : undefined}
                multiline
                numberOfLines={3}
                blurOnSubmit={false}
            />
            <Pressable
                style={style.sendButton}
                onPress={handleSend}
                disabled={isSending}>
                <SvgImage
                    name="SendArrowUpCircle"
                    size={SvgImageSize.md}
                    color={
                        websocketIsHealthy && !isSending
                            ? theme.colors.blue
                            : theme.colors.primaryVeryLight
                    }
                />
            </Pressable>
        </View>
    )
}

const styles = (theme: Theme, insets: Insets) =>
    StyleSheet.create({
        container: {
            width: '100%',
            flexDirection: 'row',
            alignItems: 'flex-end',
            marginTop: 'auto',
            backgroundColor: theme.colors.secondary,
            borderTopColor: theme.colors.primaryVeryLight,
            borderTopWidth: 1,
            paddingTop: theme.spacing.md,
            paddingLeft: theme.spacing.lg + (insets.left || 0),
            paddingRight: theme.spacing.lg + (insets.right || 0),
            paddingBottom: Math.max(theme.spacing.lg, insets.bottom || 0),
            position: 'relative',
        },
        sendButton: {
            marginBottom: theme.spacing.sm,
        },
        sendIcon: {
            height: theme.sizes.md,
            width: theme.sizes.md,
        },
        icon: {
            height: theme.sizes.md,
            width: theme.sizes.md,
            marginRight: theme.spacing.md,
            marginBottom: theme.spacing.sm,
        },
        textInputInner: {
            borderBottomWidth: 0,
            marginTop: theme.spacing.xs,
            paddingRight: theme.spacing.xl,
        },
        textInputOuter: {
            flex: 1,
            borderWidth: 0,
            backgroundColor: theme.colors.white,
        },
        textInputDisabled: {
            color: theme.colors.grey,
        },
    })

export default MessageInput
