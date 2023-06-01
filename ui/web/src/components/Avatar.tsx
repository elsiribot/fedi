import * as RadixAvatar from '@radix-ui/react-avatar'
import React from 'react'

import StringUtils from '@fedi/common/utils/StringUtils'
import { getIdentityColors } from '@fedi/common/utils/color'

import { CSSProp, styled, theme } from '../styles'
import { Icon } from './Icon'

export interface AvatarProps {
    id: string
    src?: string
    name?: string
    icon?: React.FunctionComponent<React.SVGAttributes<SVGElement>>
    size?: 'sm' | 'md' | 'lg'
    shape?: 'circle' | 'square'
    holo?: boolean
    css?: CSSProp
}

const iconSizes = { lg: 'md', md: 'sm', sm: 'xs' } as const

export const Avatar: React.FC<AvatarProps> = ({
    id,
    src,
    name,
    icon,
    size = 'md',
    shape = 'circle',
    holo,
    css,
    ...props
}) => {
    const [bgColor, textColor] = getIdentityColors(id)
    const combinedCss = {
        ...css,
        '--bg-color': holo ? theme.colors.white : bgColor,
        '--text-color': holo ? theme.colors.primary : textColor,
    }

    return (
        <Root
            size={size}
            shape={shape}
            holo={holo}
            css={combinedCss}
            {...props}>
            {src && <Image src={src} alt="" />}
            {name && (
                <Fallback delayMs={src ? 500 : 0}>
                    {icon ? (
                        <Icon icon={icon} size={iconSizes[size]} />
                    ) : (
                        StringUtils.getInitialsFromName(name)
                    )}
                </Fallback>
            )}
        </Root>
    )
}

const Root = styled(RadixAvatar.Root, {
    position: 'relative',
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    background: 'var(--bg-color)',

    variants: {
        size: {
            sm: {
                width: 32,
                height: 32,
                fontSize: 10,
            },
            md: {
                width: 48,
                height: 48,
                fontSize: 16,
            },
            lg: {
                width: 88,
                height: 88,
                fontSize: 24,
            },
        },
        shape: {
            circle: {
                borderRadius: '100%',
            },
            square: {
                borderRadius: 4,
            },
        },
        holo: {
            true: {
                holoGradient: '600',
            },
        },
    },
    defaultVariants: {
        size: 'md',
        shape: 'circle',
    },
})

const Image = styled(RadixAvatar.Image, {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
})

const Fallback = styled(RadixAvatar.Fallback, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    userSelect: 'none',
    color: 'var(--text-color)',
    fontWeight: theme.fontWeights.bold,
})
