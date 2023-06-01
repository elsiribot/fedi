import React from 'react'

import FederationAlphaImage from '@fedi/common/assets/images/federation-alpha.png'
import FederationPragueImage from '@fedi/common/assets/images/federation-prague.png'
import { Federation } from '@fedi/common/types'

import { Avatar, AvatarProps } from './Avatar'

type Props = Omit<AvatarProps, 'id' | 'shape' | 'name'> & {
    federation: Federation
}

export const FederationAvatar: React.FC<Props> = ({ federation, ...props }) => {
    let src: string | undefined

    // TODO: pull icon from federation meta, not hard coded name matching
    if (federation.name === 'Fedi Alpha') {
        src = FederationAlphaImage.src
    } else if (federation.name === 'BTC Prague') {
        src = FederationPragueImage.src
    }

    return (
        <Avatar
            id={federation.id}
            shape="square"
            src={src}
            name={federation.name}
            {...props}
        />
    )
}
