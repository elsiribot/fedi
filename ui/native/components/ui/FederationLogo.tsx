import React from 'react'

import SvgImage, { SvgImageSize } from './SvgImage'

interface Props {
    size: SvgImageSize | number
}

export const FederationLogo: React.FC<Props> = ({ size }) => {
    const svgSize = typeof size !== 'number' ? size : undefined
    const svgProps =
        typeof size === 'number' ? { width: size, height: size } : undefined
    return (
        <SvgImage
            name="FederationAlphaIcon"
            size={svgSize}
            svgProps={{ stroke: 'transparent', ...svgProps }}
        />
    )
}
