import { Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { Chat } from '../../../types'
import Avatar from '../../ui/Avatar'
import { AvatarSize } from '../../ui/Avatar'
import type { SvgImageName } from '../../ui/SvgImage'

type GroupIconProps = {
    chat: Chat
    size?: AvatarSize
}

const GroupIcon = ({ chat, size = AvatarSize.md }: GroupIconProps) => {
    return (
        <Avatar
            id={chat.id}
            name={chat.name || ''}
            icon={(chat.icon as SvgImageName) || 'SocialPeople'}
            size={size}
        />
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            position: 'relative',
            height: theme.sizes.lg,
            width: theme.sizes.lg,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
        },
        whiteCircle: {
            position: 'absolute',
            height: theme.sizes.lg - 5,
            width: theme.sizes.lg - 5,
            borderRadius: theme.sizes.lg * 0.5,
            backgroundColor: theme.colors.white,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
        },
    })

export default GroupIcon
