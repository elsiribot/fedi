import React from 'react'
import { ViewStyle, View } from 'react-native'

import { SCREEN_SIZE_THRESHOLDS } from '../../constants'
import { useKeyboardStickyPosition } from '../../utils/hooks/keyboard'

/**
 * KeyboardStickyView
 *
 * This component "sticks" its children to the bottom of the screen,
 * while dynamically adjusting its vertical position (via `marginBottom`)
 * in response to the on-screen keyboard opening or closing.
 *
 * Primary use case:
 *   Wrapping UI elements like buttons or input actions that should stay
 *   visible above the keyboard instead of being covered by it.
 *
 * Behavior details:
 * - It uses the `useKeyboardStickyPosition` hook to track whether the
 *   keyboard is active and what margin should be applied.
 * - The component supports different enablement rules depending on
 *   platform (iOS) and screen size breakpoints.
 * - When the keyboard is closed, a constant offset (`offsetClosed`) is used.
 * - When the keyboard opens, the bottom offset smoothly increases
 *   to `marginBottom` so that children stay above the keyboard.
 *
 * Screen size responsiveness:
 * - Props `enabledOnSmallScreens`, `enabledOnMediumScreens`,
 *   and `enabledOnLargeScreens` let you control on which screen sizes
 *   the sticky behavior is active.
 * - Thresholds (`smallScreenThreshold`, `largeScreenThreshold`)
 *   determine the breakpoints (defaults come from `SCREEN_SIZE_THRESHOLDS`).
 *
 * Props overview:
 * - `enabledOnIOS`: Whether sticky behavior should also apply on iOS.
 * - `offsetClosed`: Bottom margin when the keyboard is closed.
 * - `offsetOpened`: Extra offset added when keyboard is open.
 * - `style`: Optional additional styling for the wrapper <View>.
 */
interface KeyboardStickyViewProps {
    children: React.ReactNode
    mode?: 'margin' | 'absolute'
    enabledOnIOS?: boolean
    enabledOnSmallScreens?: boolean // <750px
    enabledOnMediumScreens?: boolean // 750-900px
    enabledOnLargeScreens?: boolean // >900px
    smallScreenThreshold?: number
    largeScreenThreshold?: number
    offsetClosed?: number
    offsetOpened?: number
    style?: ViewStyle
}

const KeyboardStickyView: React.FC<KeyboardStickyViewProps> = ({
    children,
    mode = 'margin',
    enabledOnIOS = false,
    enabledOnSmallScreens = false,
    enabledOnMediumScreens = true,
    enabledOnLargeScreens = true,
    smallScreenThreshold = SCREEN_SIZE_THRESHOLDS.SMALL_TO_MEDIUM,
    largeScreenThreshold = SCREEN_SIZE_THRESHOLDS.MEDIUM_TO_LARGE,
    offsetClosed = 0,
    offsetOpened = 20,
    style,
}) => {
    const { isActive, marginBottom } = useKeyboardStickyPosition({
        enabledOnIOS,
        enabledOnSmallScreens,
        enabledOnMediumScreens,
        enabledOnLargeScreens,
        smallScreenThreshold,
        largeScreenThreshold,
        offsetClosed,
        offsetOpened,
    })

    // Always respect CLOSED offset when inactive.
    if (!isActive) {
        return mode === 'absolute' ? (
            <View
                style={[
                    style,
                    {
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: offsetClosed,
                    },
                ]}>
                {children}
            </View>
        ) : (
            <View style={[style, { marginBottom: offsetClosed }]}>
                {children}
            </View>
        )
    }

    const mb = marginBottom ?? 0
    const epsilon = 0.5 // float jitter safety

    // If the hook only applied the closed offset (or nothing), treat as closed.
    const keyboardIsOpen = mb > offsetClosed + epsilon

    const computedMarginBottom = keyboardIsOpen ? mb : offsetClosed

    return mode === 'absolute' ? (
        <View
            style={[
                style,
                {
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: computedMarginBottom,
                },
            ]}>
            {children}
        </View>
    ) : (
        <View style={[style, { marginBottom: computedMarginBottom }]}>
            {children}
        </View>
    )
}

export default KeyboardStickyView
