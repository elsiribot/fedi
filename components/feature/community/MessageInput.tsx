import { useNavigation, useRoute } from '@react-navigation/native'
import { Input, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    Keyboard,
    KeyboardEvent,
    Platform,
    Pressable,
    StyleSheet,
    View,
} from 'react-native'

import { Props as DirectChatProps } from '../../../screens/DirectChat'
import { NavigationHook } from '../../../types/navigation'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'

type DirectChatRouteProp = DirectChatProps['route']

type MessageInputProps = {
    onMessageSubmitted: (message: string) => void
}

const MessageInput: React.FC<MessageInputProps> = ({
    onMessageSubmitted,
}: MessageInputProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const route = useRoute<DirectChatRouteProp>()
    const { member } = route.params
    const [messageText, setMessageText] = useState<string>('')
    const [inputHeight, setInputHeight] = useState<number>(
        theme.sizes.minMessageInputHeight,
    )
    const [keyboardHeight, setKeyboardHeight] = useState<number>(0)

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

    return (
        <View
            style={[
                styles(theme).container,
                keyboardHeight > 0 && Platform.OS === 'ios'
                    ? { paddingBottom: keyboardHeight + theme.spacing.lg }
                    : {},
            ]}>
            {/* in-chat payments only available for DirectChat */}
            {member && (
                <Pressable
                    onPress={() =>
                        navigation.navigate('ChatWallet', {
                            recipient: member,
                        })
                    }>
                    <SvgImage
                        name="Wallet"
                        containerStyle={{
                            marginRight: theme.spacing.md,
                            marginBottom: theme.spacing.sm,
                        }}
                        size={SvgImageSize.md}
                        svgProps={{
                            stroke: theme.colors.primary,
                        }}
                    />
                </Pressable>
            )}
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
                containerStyle={[
                    styles(theme).textInputOuter,
                    { height: inputHeight },
                ]}
                inputContainerStyle={styles(theme).textInputInner}
                multiline
                numberOfLines={3}
                blurOnSubmit={false}
                inputStyle={styles(theme).input}
            />
            <Pressable
                style={[
                    styles(theme).sendButton,
                    keyboardHeight > 0 && Platform.OS === 'ios'
                        ? { bottom: keyboardHeight + theme.spacing.lg + 6 }
                        : {},
                ]}
                onPress={() => {
                    if (messageText) {
                        onMessageSubmitted(messageText)
                        setMessageText('')
                    }
                }}>
                <SvgImage
                    name="SendArrowUpCircle"
                    size={SvgImageSize.md}
                    svgProps={{
                        stroke: theme.colors.blue,
                    }}
                />
            </Pressable>
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            width: '100%',
            flexDirection: 'row',
            alignItems: 'flex-end',
            marginTop: 'auto',
            backgroundColor: theme.colors.keyboardGrey,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            position: 'relative',
        },
        sendButton: {
            position: 'absolute',
            right: theme.spacing.xl,
            bottom: theme.spacing.lg + 4,
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
            borderColor: theme.colors.primaryVeryLight,
            borderWidth: 1,
            borderRadius: theme.borders.defaultRadius,
            backgroundColor: theme.colors.white,
        },
        input: {
            fontFamily: 'AlbertSans-Regular',
        },
    })

export default MessageInput
