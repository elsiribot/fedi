import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { MatrixUser } from '@fedi/common/types'

import { AvatarSize } from '../../ui/Avatar'
import { Pressable } from '../../ui/Pressable'
import ChatAvatar from './ChatAvatar'

type UserItemProps = {
    user: MatrixUser
    selectUser: (userId: string) => void
    disabled?: boolean
    actionIcon?: React.ReactNode
    rightIcon?: React.ReactNode
    showSuffix?: boolean
}

const ChatUserTile: React.FC<UserItemProps> = ({
    user,
    selectUser,
    actionIcon = null,
    rightIcon = null,
    disabled = false,
    showSuffix = false,
}: UserItemProps) => {
    const { theme } = useTheme()

    return (
        <Pressable onPress={disabled ? undefined : () => selectUser(user.id)}>
            <View style={styles(theme).usernameContainer}>
                <ChatAvatar user={user} size={AvatarSize.md} />
                <Text
                    numberOfLines={1}
                    bold
                    style={[styles(theme).usernameText]}>
                    {user.displayName}
                </Text>
                {showSuffix && (
                    <Text
                        numberOfLines={1}
                        bold
                        style={[styles(theme).usernameSuffix]}>
                        {user.displayName?.substring(0, 4)}
                    </Text>
                )}
                {rightIcon && <>{rightIcon}</>}
                {actionIcon && (
                    <View style={styles(theme).iconContainer}>
                        <>{actionIcon}</>
                    </View>
                )}
            </View>
        </Pressable>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        usernameContainer: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
            borderWidth: 1,
        },
        usernameText: {
            flexShrink: 2,
            marginLeft: theme.spacing.md,
            borderWidth: 1,
        },
        usernameSuffix: {
            borderWidth: 1,
            color: theme.colors.grey,
        },
        iconContainer: {
            marginLeft: 'auto',
            paddingLeft: theme.spacing.md,
        },
        roleText: {
            color: theme.colors.grey,
        },
    })

export default ChatUserTile
