import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    Animated,
    ActivityIndicator,
    StyleSheet,
    Easing,
    ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
    selectChatClientLastOnlineAt,
    selectChatClientStatus,
} from '@fedi/common/redux'

import { useAppSelector } from '../../../state/hooks'

interface Props {
    offset?: number
    noSafeArea?: boolean
    hide?: boolean
}

export const ChatConnectionBadge: React.FC<Props> = ({
    offset = 0,
    noSafeArea,
    hide,
}) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const insets = useSafeAreaInsets()
    const chatStatus = useAppSelector(selectChatClientStatus)
    const lastOnlineAt = useAppSelector(selectChatClientLastOnlineAt)

    const isOffline = chatStatus !== 'online'
    const [showOffline, setShowOffline] = useState(isOffline)
    const [isDisplayNone, setIsDisplayNone] = useState(!isOffline)
    const isVisible = showOffline && !hide
    const visibleAnimation = useRef(
        new Animated.Value(isVisible ? 1 : 0),
    ).current

    // Show offline badge after initial render if we go offline for more than
    // 3 seconds. Initial render will show immediately if we're offline.
    useEffect(() => {
        if (!isOffline) {
            setShowOffline(false)
            return
        }
        const now = Date.now()
        const delay = lastOnlineAt - now + 3000
        const timeout = setTimeout(() => setShowOffline(true), delay)
        return () => clearTimeout(timeout)
    }, [isOffline, lastOnlineAt])

    // Animate container in and out when visible
    useEffect(() => {
        if (isVisible) {
            setIsDisplayNone(false)
        }
        let canceled = false
        Animated.timing(visibleAnimation, {
            toValue: isVisible ? 1 : 0,
            duration: 150,
            useNativeDriver: false,
            easing: Easing.ease,
        }).start(() => {
            if (!isVisible && !canceled) {
                setIsDisplayNone(true)
            }
        })
        return () => {
            canceled = true
        }
    }, [visibleAnimation, isVisible])

    const containerStyle: ViewStyle = {
        display: isDisplayNone ? 'none' : 'flex',
        top: offset + (noSafeArea ? 0 : insets.top),
    }
    const badgeStyle: ViewStyle = {
        opacity: visibleAnimation,
        transform: [
            {
                translateY: visibleAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                }),
            },
            {
                scale: visibleAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                }),
            },
        ],
    }
    const style = styles(theme)

    return (
        <Animated.View style={[style.container, containerStyle]}>
            <Animated.View style={[style.badge, badgeStyle]}>
                <ActivityIndicator size={16} color={theme.colors.primary} />
                <Text caption medium>
                    {t('feature.chat.waiting-for-network')}
                </Text>
            </Animated.View>
        </Animated.View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            position: 'absolute',
            left: 0,
            right: 0,
            width: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: 'box-none',
            zIndex: 3,
            elevation: 3,
        },
        badge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.md,
            backgroundColor: '#FCDDEC', // TODO: Replace with fuschia from theme when new colors are added
            borderRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 24,
            shadowColor: theme.colors.night,
            shadowOpacity: 0.1,
        },
    })
