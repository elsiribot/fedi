import React, { useState, useRef, useEffect, useImperativeHandle } from 'react'

import { styled, theme } from '../styles'

export const ShadowScroller = React.forwardRef<
    React.ElementRef<'div'> | null,
    React.ComponentPropsWithoutRef<'div'>
>(({ children, ...props }, forwardedRef) => {
    const [canScrollDown, setCanScrollDown] = useState(false)
    const [canScrollUp, setCanScrollUp] = useState(false)
    const containerRef = useRef<HTMLDivElement | null>(null)

    useImperativeHandle(forwardedRef, () => containerRef.current!)

    // Update context with scroll state
    const containerEl = containerRef.current
    useEffect(() => {
        if (!containerEl) return
        const contentEl = containerEl.childNodes[0] as HTMLElement
        const checkContentScroll = () => {
            setCanScrollDown(
                contentEl.scrollHeight - contentEl.scrollTop >
                    contentEl.clientHeight + 5,
            )
            setCanScrollUp(contentEl.scrollTop - 5 > 0)
        }

        contentEl.addEventListener('scroll', checkContentScroll)
        window.addEventListener('resize', checkContentScroll)

        return () => {
            contentEl.removeEventListener('scroll', checkContentScroll)
            window.removeEventListener('resize', checkContentScroll)
        }
    }, [containerEl])

    return (
        <Container ref={containerRef} {...props}>
            <Inner>{children}</Inner>
            <Shadow position="top" visible={canScrollUp} />
            <Shadow position="bottom" visible={canScrollDown} />
        </Container>
    )
})
ShadowScroller.displayName = 'ShadowScroller'

const Container = styled('div', {
    position: 'relative',
    overflow: 'hidden',
})

const Inner = styled('div', {
    height: '100%',
    overflow: 'auto',
})

const Shadow = styled('div', {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 24,
    background: `linear-gradient(${theme.colors.primary10}, transparent)`,
    opacity: 0,
    transform: 'scaleY(0)',
    transition: 'transform 100ms ease, opacity 100ms ease',
    pointerEvents: 'none',
    zIndex: 1,

    variants: {
        position: {
            top: {
                top: 0,
                transformOrigin: 'top center',
                background: `linear-gradient(to bottom, ${theme.colors.primary05}, transparent)`,
            },
            bottom: {
                bottom: 0,
                transformOrigin: 'bottom center',
                background: `linear-gradient(to top, ${theme.colors.primary05}, transparent)`,
            },
        },
        visible: {
            true: {
                transform: 'scaleY(1)',
                opacity: 1,
            },
        },
    },
})
