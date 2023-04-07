import React from 'react'
import { css, theme } from '../styles'

interface BaseProps {
    icon: React.FunctionComponent<React.SVGAttributes<SVGElement>>
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

export type IconProps = BaseProps &
    Omit<React.SVGAttributes<SVGElement>, keyof BaseProps>

export const Icon: React.FC<IconProps> = ({
    icon: SvgIcon,
    size,
    ...props
}) => {
    return <SvgIcon className={svgCss({ size })} {...props} />
}

const svgCss = css({
    display: 'inline-block',

    variants: {
        size: {
            xs: { width: theme.sizes.xs, height: theme.sizes.xs },
            sm: { width: theme.sizes.sm, height: theme.sizes.sm },
            md: { width: theme.sizes.md, height: theme.sizes.md },
            lg: { width: theme.sizes.lg, height: theme.sizes.lg },
            xl: { width: theme.sizes.xl, height: theme.sizes.xl },
        },
    },
    defaultVariants: {
        size: 'sm',
    },
})
