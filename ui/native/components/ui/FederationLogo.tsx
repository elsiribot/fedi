import React from 'react'
import { Image } from 'react-native'

import { Federation } from '@fedi/common/types'
import { getFederationIconUrl } from '@fedi/common/utils/FederationUtils'

import SvgImage, { SvgImageSize } from './SvgImage'

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

    return iconUrl ? (
        <Image style={svgProps} source={{ uri: iconUrl }} resizeMode="cover" />
    ) : (
        <SvgImage
            name="Federation"
            size={svgSize}
            svgProps={{ stroke: 'transparent', ...svgProps }}
        />
    )
}
