import React from 'react'

import { ChatGroup } from '@fedi/common/types'

import Avatar from '../../ui/Avatar'
import { AvatarSize } from '../../ui/Avatar'

type GroupIconProps = {
    chat: ChatGroup
    size?: AvatarSize
}

const GroupIcon = ({ chat, size = AvatarSize.md }: GroupIconProps) => {
    const defaultGroupIcon = (chat as ChatGroup).broadcastOnly
        ? 'SpeakerPhone'
        : 'SocialPeople'

    return (
        <Avatar
            id={chat.id}
            name={chat.name || ''}
            icon={defaultGroupIcon}
            size={size}
        />
    )
}

export default GroupIcon
