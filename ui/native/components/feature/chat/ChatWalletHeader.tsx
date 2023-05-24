import { useRoute } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { Props as ChatWalletProps } from '../../../screens/ChatWallet'
import Avatar from '../../ui/Avatar'
import Header from '../../ui/Header'

type ChatWalletRouteProp = ChatWalletProps['route']

const getInitialsFromName = (name: string): string => {
    const names = name.split(' ')
    let initials = ''
    if (names.length === 1) {
        initials = name.substring(0, 1)
    }
    if (names.length >= 2) {
        initials = `${names[0].substring(0, 1)}${names[1].substring(0, 1)}`
    }
    return initials.toUpperCase()
}

const GroupHeader: React.FC<{}> = () => {
    const { theme } = useTheme()
    const route = useRoute<ChatWalletRouteProp>()
    const { recipient } = route.params

    return (
        <Header
            backButton
            containerStyle={styles(theme).container}
            headerCenter={
                <View style={styles(theme).recipientContainer}>
                    <Avatar
                        id={recipient.jid.toString()}
                        title={getInitialsFromName(recipient.username)}
                    />
                    <Text bold style={styles(theme).recipientText}>
                        {recipient.username}
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

export default GroupHeader
