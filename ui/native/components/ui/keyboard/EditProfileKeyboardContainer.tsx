import React from 'react'
import {
    Animated,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleProp,
    ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AndroidScreenSize } from '../../../constants'
import { useKeyboard } from '../../../utils/hooks/keyboard'
import { getAndroidScreenSize } from '../../../utils/layout'

type Props = {
    children: React.ReactNode
    style?: StyleProp<ViewStyle>
    iosOffset?: number
    dismissOnBackgroundTap?: boolean
    useStickyBottom?: boolean
}

const EditProfileKeyboardContainer: React.FC<Props> = ({
    children,
    style,
    iosOffset = 0,
    dismissOnBackgroundTap = true,
    useStickyBottom = false,
}) => {
    const insets = useSafeAreaInsets()
    const {
        isVisible,
        height: keyboardHeight,
        screenHeight,
        insets: kbInsets,
        animationDuration,
    } = useKeyboard()
    const translateY = React.useRef(new Animated.Value(0)).current
    const [bottomPadding, setBottomPadding] = React.useState(0)

    React.useEffect(() => {
        if (Platform.OS !== 'android') return

        const screenSize = getAndroidScreenSize(screenHeight)

        if (screenSize === AndroidScreenSize.SMALL) {
            const offset = !isVisible
                ? 0
                : Math.max(keyboardHeight - kbInsets.bottom - 250, 0)
            Animated.timing(translateY, {
                toValue: -offset,
                duration: animationDuration,
                useNativeDriver: true,
            }).start()
            setBottomPadding(0)
        } else {
            // When using a sticky bottom view for the button, do NOT inject extra padding here.
            if (useStickyBottom) {
                setBottomPadding(0)
            } else {
                let padding = 0
                if (isVisible && keyboardHeight > 0) {
                    const base = keyboardHeight - kbInsets.bottom
                    padding =
                        screenSize === AndroidScreenSize.MEDIUM
                            ? Math.max(base + 60, 0)
                            : Math.max(base + 80, 0)
                }
                setBottomPadding(padding)
            }
            Animated.timing(translateY, {
                toValue: 0,
                duration: animationDuration,
                useNativeDriver: true,
            }).start()
        }
    }, [
        isVisible,
        keyboardHeight,
        screenHeight,
        kbInsets.bottom,
        animationDuration,
        translateY,
        useStickyBottom,
    ])

    const content = (
        <Pressable
            accessible={false}
            onPress={dismissOnBackgroundTap ? Keyboard.dismiss : undefined}
            style={{ flex: 1 }}>
            {children}
        </Pressable>
    )

    if (Platform.OS === 'ios') {
        return (
            <KeyboardAvoidingView
                style={[{ flex: 1 }, style]}
                behavior="padding"
                enabled
                keyboardVerticalOffset={insets.bottom + iosOffset}>
                {content}
            </KeyboardAvoidingView>
        )
    }

    return (
        <Animated.View
            style={[
                {
                    flex: 1,
                    transform: [{ translateY }],
                    paddingBottom: bottomPadding,
                },
                style,
            ]}>
            {content}
        </Animated.View>
    )
}

export default EditProfileKeyboardContainer
