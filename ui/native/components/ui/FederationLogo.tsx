import React from 'react'
import { Image } from 'react-native'

import { Federation } from '@fedi/common/types'

import SvgImage, { SvgImageName, SvgImageSize } from './SvgImage'

interface Props {
    federation?: Federation
    size: SvgImageSize | number
}

export const FederationLogo: React.FC<Props> = ({ federation, size }) => {
    const svgSize = typeof size !== 'number' ? size : undefined
    const svgProps =
        typeof size === 'number' ? { width: size, height: size } : undefined

    let name: SvgImageName = 'Federation'
    if (federation?.name.toLowerCase().includes('alpha')) {
        name = 'FederationAlphaIcon'
    } else if (federation?.name.toLowerCase().includes('prague')) {
        name = 'FederationPragueIcon'
    }

    return federation?.meta?.federation_icon_url ? (
        <Image
            style={svgProps}
            source={{ uri: federation?.meta?.federation_icon_url }}
            resizeMode="cover"
        />
    ) : (
        <SvgImage
            name={name}
            size={svgSize}
            svgProps={{ stroke: 'transparent', ...svgProps }}
        />
    )
}
