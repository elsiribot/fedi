import React from 'react'

import FederationAlphaImage from '@fedi/common/assets/images/federation-alpha.png'
import FederationPragueImage from '@fedi/common/assets/images/federation-prague.png'
import { Federation } from '@fedi/common/types'

import { Avatar, AvatarProps } from './Avatar'

type Props = Omit<AvatarProps, 'id' | 'shape' | 'name'> & {
    federation: Pick<Federation, 'id' | 'name'>
}

export const FederationAvatar: React.FC<Props> = ({ federation, ...props }) => {
    let src: string | undefined

    // TODO: pull icon from federation meta, not hard coded name matching
    if ((federation as Federation)?.meta?.federation_icon_url) {
        src = (federation as Federation)?.meta?.federation_icon_url
    } else if (federation.name.toLowerCase().includes('alpha')) {
        src = FederationAlphaImage.src
    } else if (federation.name.toLowerCase().includes('prague')) {
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
