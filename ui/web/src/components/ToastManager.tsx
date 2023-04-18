import * as RadixToast from '@radix-ui/react-toast'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { selectToast } from '@fedi/common/redux'

import { useAppSelector, useToast } from '../hooks'
import { keyframes, styled, theme } from '../styles'
import { Text } from './Text'

export const ToastManager: React.FC = () => {
    const toast = useAppSelector(selectToast)
    const toastElRef = useRef<HTMLLIElement>(null)
    const [cachedToast, setCachedToast] = useState(toast)
    const [isToastOpen, setIsToastOpen] = useState(!!toast)
    const [isPaused, setIsPaused] = useState(false)
    const { closeToast } = useToast()

    const handleCloseToast = useCallback(
        (open: boolean) => {
            setIsToastOpen(open)
            if (!open) closeToast(toast?.key)
        },
        [toast, closeToast],
    )

    useEffect(() => {
        if (toast) {
            setCachedToast(toast)
            setIsToastOpen(true)
        } else if (!isPaused) {
            setIsToastOpen(false)
        }
    }, [toast, isPaused])

    return (
        <Container swipeDirection="right">
            <Toast
                key={cachedToast?.key}
                ref={toastElRef}
                open={isToastOpen}
                onOpenChange={handleCloseToast}
                duration={cachedToast?.duration}
                onPause={() => setIsPaused(true)}
                onResume={() => setIsPaused(false)}>
                {cachedToast && (
                    <ToastInner>
                        <RadixToast.Description>
                            <Text variant="caption">{cachedToast.content}</Text>
                        </RadixToast.Description>
                    </ToastInner>
                )}
            </Toast>
            <Viewport />
        </Container>
    )
}

const Container = styled(RadixToast.Provider, {
    position: 'fixed',
    bottom: 0,
    right: 0,
})

const toastSlideIn = keyframes({
    '0%': { transform: 'translateX(100%) translateX(20px)' },
    '100%': { transform: 'translateX(0)' },
})

const toastFadeOut = keyframes({
    '0%': { opacity: 1 },
    '100%': { opacity: 0 },
})

const toastSwipeOut = keyframes({
    '0%': { transform: 'translateX(var(--radix-toast-swipe-end-x))' },
    '100%': { transform: 'translateX(100%) translateX(20px)' },
})

const Toast = styled(RadixToast.Root, {
    position: 'fixed',
    bottom: 32,
    right: 20,
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    background: theme.colors.white,
    textAlign: 'left',
    boxShadow: `0 4px 24px 0 ${theme.colors.primary10}`,

    '&[data-state="open"]': {
        animation: `${toastSlideIn} 150ms ease-out`,
    },
    '&[data-state="closed"]': {
        animation: `${toastFadeOut} 150ms ease-in`,
    },
    '&[data-swipe="move"]': {
        transform: 'translateX(var(--radix-toast-swipe-move-x))',
    },
    '&[data-swape="cance"]': {
        transform: 'translateX(0)',
        transition: 'transform 150ms ease-out',
    },
    '&[data-swipe="end"]': {
        animation: `${toastSwipeOut} 100ms ease-out`,
    },
})

const ToastInner = styled('div', {
    width: '100%',
    padding: 20,
    borderRadius: 20,
    border: `1px solid ${theme.colors.lightGrey}`,
    holoGradient: '400',
})

const Viewport = styled(RadixToast.Viewport, {
    position: 'fixed',
    bottom: 0,
    right: 0,
    zIndex: 2147483647, // max
    listStyle: 'none',
    outline: 'none',
})
