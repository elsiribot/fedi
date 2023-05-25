import React from 'react'

import { Chat, Group } from '../../../types'
import Avatar from '../../ui/Avatar'
import { AvatarSize } from '../../ui/Avatar'
import type { SvgImageName } from '../../ui/SvgImage'

type GroupIconProps = {
    chat: Chat
    size?: AvatarSize
}

const GroupIcon = ({ chat, size = AvatarSize.md }: GroupIconProps) => {
    const defaultGroupIcon = (chat as Group).broadcastOnly
        ? 'SpeakerPhone'
        : 'SocialPeople'

    return (
        <Avatar
            id={chat.id}
            name={chat.name || ''}
            icon={(chat.icon as SvgImageName) || defaultGroupIcon}
            size={size}
        />
    )
}

export default GroupIcon
