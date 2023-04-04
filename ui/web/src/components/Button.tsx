import React from 'react'
import { styled, theme } from '../styles'
import Link, { LinkProps } from 'next/link'
import { Icon, IconProps } from './Icon'

interface BaseProps {
    variant?: 'primary' | 'secondary' | 'tertiary' | 'outline'
    size?: 'md' | 'sm'
    icon?: IconProps['icon']
}
type ButtonProps = BaseProps &
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps>

type ButtonLinkProps = BaseProps &
    Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps> &
    Omit<LinkProps, keyof BaseProps>

type ButtonExternalLinkProps = BaseProps &
    Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps>

type Props = ButtonProps | ButtonLinkProps | ButtonExternalLinkProps

export const Button: React.FC<Props> = ({
    variant = 'primary',
    size = 'md',
    icon,
    children,
    ...props
}) => {
    const content = (
        <ButtonContent>
            {icon && <Icon icon={icon} size="xs" />}
            <div>{children}</div>
        </ButtonContent>
    )

    if ('href' in props) {
        if (typeof props.href === 'string' && props.href.startsWith('http')) {
            return (
                <ButtonBase
                    as="a"
                    target="_blank"
                    rel="noopener noreferrer"
                    {...(props as React.HTMLAttributes<HTMLAnchorElement>)}
                    variant={variant}
                    size={size}>
                    {content}
                </ButtonBase>
            )
        } else {
            return (
                <ButtonBase
                    as={Link}
                    {...(props as React.HTMLAttributes<HTMLAnchorElement>)}
                    href={props.href || ''}
                    variant={variant}
                    size={size}>
                    {content}
                </ButtonBase>
            )
        }
    } else {
        return (
            <ButtonBase
                {...(props as React.HTMLAttributes<HTMLButtonElement>)}
                variant={variant}
                size={size}>
                {content}
            </ButtonBase>
        )
    }
}

const ButtonBase = styled('button', {
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontWeight: 500,
    borderRadius: 40,
    border: 'none',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'background-color 100ms ease',

    variants: {
        variant: {
            primary: {
                background: theme.colors.night,
                color: theme.colors.white,
                '&:hover': {
                    opacity: 0.9,
                },
                '&:active': {
                    opacity: 0.8,
                },
            },
            secondary: {
                background: 'linear-gradient(#ffffff, #0b101324)',
                color: '#0b1013',
                '&:hover': {
                    background: 'linear-gradient(#ffffff, #0b101336)',
                },
                '&:active': {
                    background: 'linear-gradient(#ffffff, #0b101350)',
                },
            },
            tertiary: {
                background: 'none',
                color: '#0b1013',
                '&:hover': {
                    background: 'rgba(#0b1013, 0.05)',
                },
                '&:active': {
                    background: 'rgba(#0b1013, 0.1)',
                },
            },
            outline: {
                background: 'none',
                color: '#0b1013',
                border: '2px solid #0b1013',
                '&:hover': {
                    background: 'rgba(#0b1013, 0.05)',
                },
                '&:active': {
                    background: 'rgba(#0b1013, 0.1)',
                },
            },
        },
        size: {
            md: {
                height: 48,
                padding: '0 20px',
                fontSize: 14,
            },
            sm: {
                height: 24,
                padding: '0 8px',
                fontSize: 12,
            },
        },
    },
    defaultVariants: {
        variant: 'primary',
        size: 'md',
    },
})

const ButtonContent = styled('div', {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
})
