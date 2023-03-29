import clsx from 'clsx'
import React from 'react'
import Link, { LinkProps } from 'next/link'
import styles from './style.module.scss'

interface BaseProps {
    variant?: 'primary' | 'secondary' | 'tertiary' | 'outline'
    size?: 'medium' | 'small'
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
    size = 'medium',
    className: propsClassName,
    ...props
}) => {
    const className = clsx(
        propsClassName,
        styles.button,
        styles[`variant--${variant}`],
        styles[`size--${size}`],
    )

    if ('href' in props) {
        if (typeof props.href === 'string' && props.href.startsWith('http')) {
            return (
                <a
                    target="_blank"
                    rel="noopener noreferrer"
                    {...props}
                    className={className}
                />
            )
        } else {
            return (
                <Link
                    {...(props as React.HTMLAttributes<HTMLAnchorElement>)}
                    href={props.href || ''}
                    className={className}
                />
            )
        }
    } else {
        return (
            <button
                {...(props as React.HTMLAttributes<HTMLButtonElement>)}
                className={className}
            />
        )
    }
}
