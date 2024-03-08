import React from 'react'

import { MatrixRoom, MatrixUser } from '@fedi/common/types'
import { matrixIdToUsername } from '@fedi/common/utils/matrix'

import Avatar, { AvatarProps } from '../../ui/Avatar'

type BaseProps = Omit<AvatarProps, 'id' | 'name' | 'icon'>
type RoomProps = BaseProps & {
    room: Pick<
        MatrixRoom,
        'id' | 'name' | 'broadcastOnly' | 'avatarUrl' | 'directUserId'
    >
}
type UserProps = BaseProps & {
    user: Pick<MatrixUser, 'id' | 'displayName' | 'avatarUrl'>
}
type Props = RoomProps | UserProps

const ChatAvatar: React.FC<Props> = props => {
    let id: string | undefined
    let name: string | undefined
    let icon: AvatarProps['icon'] | undefined
    let src: string | undefined
    let avatarProps: BaseProps
    if ('room' in props) {
        const { room, ...rest } = props
        id = room.directUserId || room.id
        name = room.name
        icon = room.directUserId
            ? undefined
            : room.broadcastOnly
            ? 'SpeakerPhone'
            : 'SocialPeople'
        src = room.avatarUrl
        avatarProps = rest
    } else {
        const { user, ...rest } = props
        id = user.id
        name = user.displayName || matrixIdToUsername(user.id)
        src = user.avatarUrl
        avatarProps = rest
    }

    return (
        <Avatar
            id={id || ''}
            name={name || '?'}
            icon={icon}
            // src={src}
            {...avatarProps}
        />
    )
}

export default ChatAvatar
