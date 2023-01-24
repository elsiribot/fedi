import { useNavigation, useRoute } from '@react-navigation/native'
import { Image, Input, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'

import { Images } from '../../../assets/images'
import { Props as DirectChatProps } from '../../../screens/DirectChat'
import { NavigationHook } from '../../../types/navigation'

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

    return (
        <View style={styles(theme).container}>
            {/* in-chat payments only available for DirectChat */}
            {member && (
                <Pressable
                    onPress={() =>
                        navigation.navigate('ChatWallet', {
                            recipient: member,
                        })
                    }>
                    <Image style={styles(theme).icon} source={Images.Wallet} />
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
            />
            <Pressable
                style={styles(theme).sendButton}
                onPress={() => {
                    onMessageSubmitted(messageText)
                    setMessageText('')
                }}>
                <Image
                    source={Images.SendArrowUpCircle}
                    style={styles(theme).sendIcon}
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
            bottom: theme.spacing.lg + 3,
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
    })

export default MessageInput
