import { useNavigation } from '@react-navigation/native'
import { Image, Input, Theme, useTheme } from '@rneui/themed'
import { JID } from '@xmpp/jid'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'

import { Images } from '../../../assets/images'
import {
    XMPP_DOMAIN,
    XMPP_RESOURCE,
} from '../../../state/contexts/CommunityContext'
import { Member } from '../../../types'
import { NavigationHook } from '../../../types/navigation'

type MessageInputProps = {
    onMessageSubmitted: (message: string) => void
}

const MessageInput: React.FC<MessageInputProps> = ({
    onMessageSubmitted,
}: MessageInputProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const [messageText, setMessageText] = useState<string>('')
    const [inputHeight, setInputHeight] = useState<number>(
        theme.sizes.minMessageInputHeight,
    )

    return (
        <View style={styles(theme).container}>
            <Input
                onChangeText={setMessageText}
                value={messageText}
                placeholder={`${t('words.message')}`}
                returnKeyType="send"
                onSubmitEditing={({ nativeEvent: { text } }) => {
                    onMessageSubmitted(text)
                    setMessageText('')
                }}
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
                blurOnSubmit={true}
            />
            <Pressable
                // TODO: Disable if not exactly 1 recipient in room
                disabled={false}
                onPress={() =>
                    navigation.navigate('ChatWallet', {
                        recipient: new Member({
                            jid: new JID('oz139', XMPP_DOMAIN, XMPP_RESOURCE),
                        }),
                    })
                }>
                <Image style={styles(theme).icon} source={Images.Cash} />
            </Pressable>
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 'auto',
            backgroundColor: theme.colors.keyboardGrey,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
        },
        icon: {
            height: theme.sizes.md,
            width: theme.sizes.md,
            marginLeft: theme.spacing.md,
            // Disabled
            opacity: 0.25,
        },
        textInputInner: {
            borderBottomWidth: 0,
            marginTop: theme.spacing.xs,
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
