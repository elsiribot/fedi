import { useTheme } from '@rneui/themed'
import React from 'react'
import { View } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'

import { theme as fediTheme } from '@fedi/common/constants/theme'

type HoloGradientProps = {
    size?: number
    level?: keyof typeof fediTheme.holoGradient
    rounded?: boolean
}

const HoloGradient: React.FC<HoloGradientProps> = ({
    size,
    level = '900',
    rounded = false,
}: HoloGradientProps) => {
    const { theme } = useTheme()
    const customSize = size || theme.sizes.defaultHoloGradient
    const height = customSize
    const width = customSize
    const style = {
        height,
        width,
        ...(rounded ? { borderRadius: customSize * 0.5 } : {}),
    }
    return (
        <View>
            <LinearGradient
                start={{ x: 0, y: 0.75 }}
                end={{ x: 1, y: 0.95 }}
                colors={fediTheme.holoGradient[level]}
                style={style}
            />
        </View>
    )
}

export default HoloGradient
