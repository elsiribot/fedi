import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useMemo } from 'react'
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native'

import { MatrixUser } from '@fedi/common/types'
import { getUserSuffix } from '@fedi/common/utils/matrix'

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
    containerStyle?: StyleProp<ViewStyle>
}

const ChatUserTile: React.FC<UserItemProps> = ({
    user,
    selectUser,
    actionIcon = null,
    rightIcon = null,
    disabled = false,
    showSuffix = false,
    containerStyle,
}: UserItemProps) => {
    const { theme } = useTheme()

    const suffix = useMemo(() => {
        return getUserSuffix(user.id)
    }, [user])

    return (
        <Pressable
            containerStyle={containerStyle}
            onPress={disabled ? undefined : () => selectUser(user.id)}>
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
                        caption
                        style={styles(theme).usernameSuffix}>
                        {suffix}
                    </Text>
                )}

                <View style={styles(theme).iconContainer}>
                    {rightIcon && rightIcon}
                    {actionIcon && actionIcon}
                </View>
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
        },
        usernameText: {
            flexShrink: 2,
            marginLeft: theme.spacing.md,
            paddingRight: theme.spacing.xs,
        },
        usernameSuffix: {
            color: theme.colors.grey,
        },
        iconContainer: {
            marginLeft: 'auto',
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.xs,
            paddingLeft: theme.spacing.sm,
        },
        roleText: {
            color: theme.colors.grey,
        },
    })

export default ChatUserTile
