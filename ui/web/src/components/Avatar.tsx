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
    shape?: 'circle' | 'hexagon'
    holo?: boolean
    css?: CSSProp
}

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
                        <Icon icon={icon} />
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
            hexagon: {
                clipPath: `polygon(45% 1.33975%, 46.5798% 0.60307%, 48.26352% 0.15192%, 50% 0%, 51.73648% 0.15192%, 53.4202% 0.60307%, 55% 1.33975%, 89.64102% 21.33975%, 91.06889% 22.33956%, 92.30146% 23.57212%, 93.30127% 25%, 94.03794% 26.5798%, 94.48909% 28.26352%, 94.64102% 30%, 94.64102% 70%, 94.48909% 71.73648%, 94.03794% 73.4202%, 93.30127% 75%, 92.30146% 76.42788%, 91.06889% 77.66044%, 89.64102% 78.66025%, 55% 98.66025%, 53.4202% 99.39693%, 51.73648% 99.84808%, 50% 100%, 48.26352% 99.84808%, 46.5798% 99.39693%, 45% 98.66025%, 10.35898% 78.66025%, 8.93111% 77.66044%, 7.69854% 76.42788%, 6.69873% 75%, 5.96206% 73.4202%, 5.51091% 71.73648%, 5.35898% 70%, 5.35898% 30%, 5.51091% 28.26352%, 5.96206% 26.5798%, 6.69873% 25%, 7.69854% 23.57212%, 8.93111% 22.33956%, 10.35898% 21.33975%)`,
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
