import React from 'react'

import { theme as fediTheme } from '@fedi/common/constants/theme'

import { css } from '../styles'

interface BaseProps {
    icon: React.FunctionComponent<React.SVGAttributes<SVGElement>>
    size?: keyof typeof fediTheme.sizes | number
}

export type IconProps = BaseProps &
    Omit<React.SVGAttributes<SVGElement>, keyof BaseProps>

export const Icon: React.FC<IconProps> = ({
    icon: SvgIcon,
    size = 'sm',
    ...props
}) => {
    const className = svgCss({
        size: typeof size !== 'number' ? size : undefined,
    })

    const style =
        typeof size === 'number'
            ? { width: size, height: size }
            : {
                  width: fediTheme.sizes[size],
                  height: fediTheme.sizes[size],
              }

    return <SvgIcon className={className} style={style} {...props} />
}

const svgCss = css({
    display: 'inline-block',
})
