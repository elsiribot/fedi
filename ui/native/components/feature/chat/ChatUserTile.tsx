import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { MatrixUser } from '@fedi/common/types'

import { AvatarSize } from '../../ui/Avatar'
import ChatAvatar from './ChatAvatar'

type UserItemProps = {
    user: MatrixUser
    selectUser: (userId: string) => void
    disabled?: boolean
    actionIcon?: React.ReactNode
    rightIcon?: React.ReactNode
}

const ChatUserTile: React.FC<UserItemProps> = ({
    user,
    selectUser,
    actionIcon = null,
    rightIcon = null,
    disabled = false,
}: UserItemProps) => {
    const { theme } = useTheme()

    return (
        <Pressable
            style={({ pressed }) => [
                styles(theme).container,
                pressed && !disabled
                    ? { backgroundColor: theme.colors.primary05 }
                    : {},
            ]}
            onPress={() => {
                !disabled && selectUser(user.id)
            }}>
            <View style={styles(theme).usernameContainer}>
                <ChatAvatar user={user} size={AvatarSize.md} />
                <Text
                    numberOfLines={1}
                    bold
                    style={[styles(theme).usernameText]}>
                    {user.displayName}
                </Text>
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
        container: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            padding: theme.spacing.sm,
            width: '100%',
            borderRadius: theme.borders.defaultRadius,
        },
        usernameContainer: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
        },
        usernameText: {
            marginHorizontal: theme.spacing.md,
            flex: 1,
        },
        iconContainer: {
            marginLeft: 'auto',
        },
        roleText: {
            color: theme.colors.grey,
        },
    })

export default ChatUserTile
