import { useTheme } from '@rneui/themed'
import React, { useEffect, useRef } from 'react'
import { ViewStyle } from 'react-native'
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

    useEffect(() => {
        dispatch(initializeToastRef(toastRef.current))
    }, [dispatch, toastRef])

    return (
        <TypesafeToast
            ref={(ref: any) => {
                toastRef.current = ref
            }}
            position="top"
            positionValue={200}
            fadeInDuration={150}
            fadeOutDuration={150}
            opacity={0.85}
            textStyle={{
                color: theme.colors.white,
                fontSize: 16,
            }}
        />
    )
}

export default CustomToast
