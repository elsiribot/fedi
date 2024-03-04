import * as Portal from '@radix-ui/react-portal'
import * as RadixToast from '@radix-ui/react-toast'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { useToast } from '@fedi/common/hooks/toast'
import { selectToast } from '@fedi/common/redux'

import { useAppSelector, useMediaQuery } from '../hooks'
import { config, keyframes, styled, theme } from '../styles'
import { Text } from './Text'

export const ToastManager: React.FC = () => {
    const toast = useAppSelector(selectToast)
    const toastElRef = useRef<HTMLLIElement>(null)
    const [cachedToast, setCachedToast] = useState(toast)
    const [isToastOpen, setIsToastOpen] = useState(!!toast)
    const { close } = useToast()
    const isMobile = useMediaQuery(config.media.sm)

    const handleCloseToast = useCallback(
        (open: boolean) => {
            setIsToastOpen(open)
            if (!open) close(toast?.key)
        },
        [toast, close],
    )

    useEffect(() => {
        if (toast) {
            setCachedToast(toast)
            setIsToastOpen(true)
        } else {
            setIsToastOpen(false)
        }
    }, [toast])

    return (
        <Portal.Root>
            <RadixToast.Provider swipeDirection={isMobile ? 'up' : 'right'}>
                <Toast
                    key={cachedToast?.key}
                    ref={toastElRef}
                    open={isToastOpen}
                    onOpenChange={handleCloseToast}
                    duration={Infinity}>
                    {cachedToast && (
                        <ToastInner>
                            <RadixToast.Description>
                                <Text variant="caption">
                                    {cachedToast.content}
                                </Text>
                            </RadixToast.Description>
                        </ToastInner>
                    )}
                </Toast>
                <Viewport />
            </RadixToast.Provider>
        </Portal.Root>
    )
}

const toastSlideLeft = keyframes({
    '0%': { transform: 'translateX(100%) translateX(20px)' },
    '100%': { transform: 'translateX(0)' },
})

const toastSwipeRight = keyframes({
    '0%': { transform: 'translateX(var(--radix-toast-swipe-end-x))' },
    '100%': { transform: 'translateX(100%) translateX(20px)' },
})

const toastSlideDown = keyframes({
    '0%': { transform: 'translateY(-100%) translateY(-32px)' },
    '100%': { transform: 'translateY(0)' },
})

const toastSwipeUp = keyframes({
    '0%': { transform: 'translateY(var(--radix-toast-swipe-end-y))' },
    '100%': { transform: 'translateY(-100%) translateY(-32px)' },
})

const toastFadeOut = keyframes({
    '0%': { opacity: 1 },
    '100%': { opacity: 0 },
})

const Toast = styled(RadixToast.Root, {
    width: '100%',
    borderRadius: 20,
    background: theme.colors.white,
    textAlign: 'left',
    boxShadow: `0 4px 24px 0 ${theme.colors.primary10}`,

    '&[data-state="open"]': {
        animation: `${toastSlideLeft} 150ms ease-out`,
    },
    '&[data-state="closed"]': {
        animation: `${toastFadeOut} 150ms ease-in`,
    },
    '&[data-swipe="move"]': {
        transform: 'translateX(var(--radix-toast-swipe-move-x))',
    },
    '&[data-swipe="cancel"]': {
        transform: 'translateX(0)',
        transition: 'transform 150ms ease-out',
    },
    '&[data-swipe="end"]': {
        animation: `${toastSwipeRight} 100ms ease-out`,
    },

    '@md': {
        '&[data-state="open"]': {
            animationName: toastSlideDown,
        },
        '&[data-swipe="move"]': {
            transform: 'translateY(var(--radix-toast-swipe-move-y))',
        },
        '&[data-swape="cancel"]': {
            transform: 'translateY(0)',
        },
        '&[data-swipe="end"]': {
            animationName: toastSwipeUp,
        },
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
    bottom: 32,
    right: 20,
    width: '100%',
    maxWidth: 320,
    padding: 0,
    zIndex: 2147483647, // max
    listStyle: 'none',
    outline: 'none',

    '@md': {
        display: 'flex',
        justifyContent: 'center',
        bottom: 'auto',
        right: 'auto',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
    },

    '@xs': {
        width: 'calc(100% - 24px)',
    },
})
