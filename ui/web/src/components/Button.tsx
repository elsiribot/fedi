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
    transition: 'background-color 100ms ease, filter 100ms ease',

    '&:disabled': {
        opacity: 0.5,
        pointerEvents: 'none',
    },

    variants: {
        variant: {
            primary: {
                background: `linear-gradient(${theme.colors.white20}, transparent), linear-gradient(${theme.colors.primary}, ${theme.colors.primary})`,
                color: theme.colors.white,
                '&:hover': {
                    filter: 'brightness(1.25)',
                },
                '&:active': {
                    filter: 'brightness(1.5)',
                },
            },
            secondary: {
                background: `linear-gradient(${theme.colors.white}, ${theme.colors.primary10})`,
                boxShadow: `0 0 0 0.25px ${theme.colors.lightGrey} inset`,
                color: theme.colors.primary,
                '&:hover': {
                    filter: 'brightness(0.95)',
                },
                '&:active': {
                    filter: 'brightness(0.9)',
                },
            },
            tertiary: {
                background: 'none',
                color: theme.colors.primary,
                '&:hover': {
                    background: theme.colors.primary05,
                },
                '&:active': {
                    background: theme.colors.primary10,
                },
            },
            outline: {
                background: 'none',
                color: theme.colors.primary,
                border: `2px solid ${theme.colors.primary}`,
                '&:hover': {
                    background: theme.colors.primary05,
                },
                '&:active': {
                    background: theme.colors.primary10,
                },
            },
        },
        size: {
            md: {
                height: 48,
                padding: '0 40px',
                fontSize: 14,
            },
            sm: {
                height: 24,
                padding: '0 20px',
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
