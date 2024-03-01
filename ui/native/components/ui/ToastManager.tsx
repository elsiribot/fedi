import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
    Animated,
    View,
    Text,
    TouchableOpacity,
    PanResponder,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useToast } from '@fedi/common/hooks/toast'
import { selectToast } from '@fedi/common/redux'

import { useAppSelector } from '../../state/hooks'

export default function ToastManager() {
    const toast = useAppSelector(selectToast)
    const slideAnim = useRef(new Animated.Value(-100)).current
    const insets = useSafeAreaInsets()
    const [cachedToast, setCachedToast] = useState(toast)
    const [isPaused, setIsPaused] = useState(false)

    const { close } = useToast()

    const handleCloseToast = useCallback(() => {
        Animated.timing(slideAnim, {
            toValue: -100, // Move back to the initial off-screen position
            duration: 300,
            useNativeDriver: true,
        }).start()

        if (toast?.key) {
            close(toast.key)
        }
    }, [close, toast, slideAnim])

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            // User is holding a finger on the toast
            onPanResponderGrant: () => {
                setIsPaused(true)
            },
            // User releases finger from the toast
            onPanResponderRelease: () => {
                setIsPaused(false)
            },
            // Reset state if gesture is cancelled
            onPanResponderTerminate: () => {
                setIsPaused(false)
            },
        }),
    ).current

    useEffect(() => {
        if (toast && !isPaused) {
            setCachedToast(toast)
            slideAnim.setValue(-100) // Reset position before animation
            Animated.timing(slideAnim, {
                toValue: insets.top, // Adjust for safe area
                duration: 300,
                useNativeDriver: true,
            }).start()
        } else if (!toast && !isPaused) {
            handleCloseToast()
        }
    }, [toast, slideAnim, handleCloseToast, insets, isPaused])

    return (
        <Animated.View
            style={{
                transform: [{ translateY: slideAnim }],
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                alignItems: 'center',
                padding: 20,
                backgroundColor: 'black',
            }}
            {...panResponder.panHandlers}>
            {cachedToast && (
                <View
                    style={{
                        padding: 10,
                        borderRadius: 5,
                    }}>
                    <Text style={{ color: 'white' }}>
                        {cachedToast.content}
                    </Text>
                </View>
            )}
            <TouchableOpacity onPress={handleCloseToast}>
                <Text style={{ color: 'white', paddingTop: 5 }}>Close</Text>
            </TouchableOpacity>
        </Animated.View>
    )
}
