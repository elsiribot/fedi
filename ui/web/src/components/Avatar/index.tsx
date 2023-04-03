import clsx from 'clsx'
import React from 'react'
import * as RadixAvatar from '@radix-ui/react-avatar'
import styles from './style.module.scss'

interface Props {
    src?: string
    name?: string
    hexagon?: boolean
    size?: 'small' | 'medium' | 'large'
}

export const Avatar: React.FC<Props> = ({
    src,
    name,
    hexagon,
    size = 'medium',
}) => {
    return (
        <RadixAvatar.Root
            className={clsx(
                styles.container,
                styles[`size--${size}`],
                hexagon && styles.isHexagon,
            )}>
            {src && (
                <RadixAvatar.AvatarImage className={styles.image} src={src} />
            )}
            {name && (
                <RadixAvatar.AvatarFallback
                    className={styles.initials}
                    delayMs={500}>
                    {makeInitials(name)}
                </RadixAvatar.AvatarFallback>
            )}
        </RadixAvatar.Root>
    )
}

const makeInitials = (name: string) =>
    name
        .split(' ')
        .map(word => word[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
