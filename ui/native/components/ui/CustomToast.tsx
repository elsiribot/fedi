import { useTheme } from '@rneui/themed'
import React, { useEffect, useRef, useState } from 'react'
import { Keyboard, KeyboardEvent, ViewStyle } from 'react-native'
import Toast, { ToastComponentProps } from 'react-native-easy-toast'

import {
    initializeToastRef,
    useEnvironmentContext,
} from '../../state/contexts/EnvironmentContext'

interface Props extends ToastComponentProps {
    style?: ViewStyle
}
const TypesafeToast = React.forwardRef(
    (props: Props, ref: React.LegacyRef<Toast>) => (
        <Toast ref={ref} {...props} />
    ),
)

const CustomToast = () => {
    const { theme } = useTheme()
    const { dispatch } = useEnvironmentContext()
    const toastRef = useRef<Toast | null>(null)
    const [keyboardHeight, setKeyboardHeight] = useState<number>(0)

    useEffect(() => {
        dispatch(initializeToastRef(toastRef.current))
    }, [dispatch, toastRef])

    useEffect(() => {
        const keyboardShownListener = Keyboard.addListener(
            'keyboardDidShow',
            (e: KeyboardEvent) => {
                setKeyboardHeight(e.endCoordinates.height)
            },
        )
        const keyboardHiddenListener = Keyboard.addListener(
            'keyboardDidHide',
            () => {
                setKeyboardHeight(0)
            },
        )

        return () => {
            keyboardShownListener.remove()
            keyboardHiddenListener.remove()
        }
    }, [])

    return (
        <TypesafeToast
            ref={toastRef}
            position="bottom"
            positionValue={150 + keyboardHeight}
            fadeInDuration={150}
            fadeOutDuration={150}
            opacity={0.85}
            style={{
                marginHorizontal: theme.spacing.xl,
            }}
            textStyle={{
                color: theme.colors.white,
                fontSize: 16,
                textAlign: 'center',
            }}
        />
    )
}

export default CustomToast
