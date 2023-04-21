import React, { useEffect, useState } from 'react'

import CheckIcon from '@fedi/common/assets/svgs/check.svg'
import ErrorIcon from '@fedi/common/assets/svgs/error.svg'

import { keyframes, styled, theme } from '../styles'
import { Icon } from './Icon'
import { Text } from './Text'

export interface DialogStatusProps {
    status: 'success' | 'error' | 'loading'
    title?: React.ReactNode
    description?: React.ReactNode
}

export const DialogStatus: React.FC<DialogStatusProps> = ({
    status,
    title,
    description,
}) => {
    const [backgroundRotation, setBackgroundRotation] = useState(0)
    const icon =
        status === 'success'
            ? CheckIcon
            : status === 'error'
            ? ErrorIcon
            : undefined

    // Rotate while in loading status
    useEffect(() => {
        if (status !== 'loading') return
        let isRotating = true
        let startTime = 0
        const rotate = (time: number) => {
            if (!isRotating) return
            if (!startTime) startTime = time
            setBackgroundRotation(deg => deg + (time - startTime) * 0.0002)
            requestAnimationFrame(rotate)
        }
        requestAnimationFrame(rotate)
        return () => {
            isRotating = false
        }
    }, [status])

    return (
        <Container>
            <StatusBackground
                status={status}
                style={
                    {
                        '--rotation': `${backgroundRotation}deg`,
                        '--scale': status === 'loading' ? 1.04 : 3,
                    } as React.CSSProperties
                }
            />
            <Content>
                {icon && <Icon size="md" icon={icon} />}
                {title && (
                    <Text variant="h2" weight="medium">
                        {title}
                    </Text>
                )}
                {description && <Text variant="caption">{description}</Text>}
            </Content>
        </Container>
    )
}

const fadeIn = keyframes({
    '0%': { opacity: 0 },
    '100%': { opacity: 1 },
})

const Container = styled('div', {
    position: 'absolute',
    inset: 0,
    background: theme.colors.white,
    animation: `${fadeIn} 200ms ease`,
})

const circleStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '80%',
    maxWidth: 280,
    aspectRatio: '1 / 1',
    borderRadius: '100%',
}

const Content = styled('div', {
    ...circleStyle,
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    gap: 8,
    transform: 'translate(-50%, -50%)',
    background: theme.colors.white,
})

const StatusBackground = styled('div', {
    ...circleStyle,
    zIndex: 1,
    transform:
        'translate(-50%, -50%) rotate(var(--rotation)) scale(var(--scale))',
    transition: 'transform 500ms ease',
    variants: {
        status: {
            success: {
                holoGradient: '600',
            },
            error: {
                background: theme.colors.extraLightGrey,
            },
            loading: {
                holoGradient: '600',
                transition: 'none',
            },
        },
    },
})
