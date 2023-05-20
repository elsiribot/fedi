import React from 'react'

import FederationAlphaImage from '@fedi/common/assets/images/federation-alpha.png'
import { Federation } from '@fedi/common/types'

import { Avatar, AvatarProps } from './Avatar'

type Props = Omit<AvatarProps, 'id' | 'shape' | 'name'> & {
    federation: Federation
}

export const FederationAvatar: React.FC<Props> = ({ federation, ...props }) => {
    const src =
        federation.name === 'Fedi Alpha' ? FederationAlphaImage.src : undefined
    return (
        <Avatar
            id={federation.id}
            shape="hexagon"
            src={src}
            name={federation.name}
            {...props}
        />
    )
}
