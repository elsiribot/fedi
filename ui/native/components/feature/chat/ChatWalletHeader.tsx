import { useRoute } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { selectChatMember } from '@fedi/common/redux'

import { Props as ChatWalletProps } from '../../../screens/ChatWallet'
import { useAppSelector } from '../../../state/hooks'
import Avatar from '../../ui/Avatar'
import Header from '../../ui/Header'

type ChatWalletRouteProp = ChatWalletProps['route']

const ChatWalletHeader: React.FC<{}> = () => {
    const { theme } = useTheme()
    const route = useRoute<ChatWalletRouteProp>()
    const { recipientId } = route.params
    const chatMember = useAppSelector(s => selectChatMember(s, recipientId))

    return (
        <Header
            backButton
            containerStyle={styles(theme).container}
            headerCenter={
                <View style={styles(theme).recipientContainer}>
                    <Avatar
                        id={chatMember?.id || ''}
                        name={chatMember?.username || ''}
                    />
                    <Text bold style={styles(theme).recipientText}>
                        {chatMember?.username || ''}
                    </Text>
                </View>
            }
        />
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            marginTop: theme.spacing.md,
        },
        recipientContainer: {
            padding: theme.spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
        },
        recipientText: {
            marginLeft: theme.spacing.sm,
        },
    })

export default ChatWalletHeader
