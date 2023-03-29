import React from 'react'
import clsx from 'clsx'
import styles from './style.module.scss'

interface Props {
    variant?: 'display' | 'h1' | 'h2' | 'body' | 'caption' | 'small' | 'tiny'
    weight?: 'normal' | 'medium' | 'bold'
    children: React.ReactNode
}

export const Text: React.FC<Props> = ({
    variant = 'body',
    weight = 'normal',
    children,
}) => {
    const className = clsx(
        styles.text,
        styles[`variant--${variant}`],
        styles[`weight--${weight}`],
    )
    return <div className={className}>{children}</div>
}
