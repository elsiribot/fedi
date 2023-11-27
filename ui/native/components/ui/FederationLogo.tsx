import React from 'react'
import { Image } from 'react-native'

import { Federation } from '@fedi/common/types'
import { getFederationIconUrl } from '@fedi/common/utils/FederationUtils'

import SvgImage, { SvgImageName, SvgImageSize } from './SvgImage'

type Props = {
    federation?: Pick<Federation, 'id' | 'name' | 'meta'>
    size: SvgImageSize | number
}

export const FederationLogo: React.FC<Props> = ({ federation, size }) => {
    const iconUrl = federation?.meta
        ? getFederationIconUrl(federation?.meta)
        : null
    const svgSize = typeof size !== 'number' ? size : undefined
    const svgProps =
        typeof size === 'number' ? { width: size, height: size } : undefined

    let name: SvgImageName = 'Federation'
    if (federation?.name.toLowerCase().includes('alpha')) {
        name = 'FederationAlphaIcon'
    } else if (federation?.name.toLowerCase().includes('prague')) {
        name = 'FederationPragueIcon'
    }

    return iconUrl ? (
        <Image style={svgProps} source={{ uri: iconUrl }} resizeMode="cover" />
    ) : (
        <SvgImage
            name={name}
            size={svgSize}
            svgProps={{ stroke: 'transparent', ...svgProps }}
        />
    )
}
