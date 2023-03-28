import { useTheme } from '@rneui/themed'
import React from 'react'
import { View } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'

// These should be kept in sync with the Figma design
// https://www.figma.com/file/tofJj4TxL6U4OtDC2D9KUg/Fedi's-team-library?node-id=849%3A2864&t=vV4mC9bS4dqP2JHC-0
const HOLO_GRADIENT_COLORS = {
    '900': [
        'rgba(224, 32, 32, 0.3)',
        'rgba(247, 181, 0, 0.3)',
        'rgba(109, 212, 0, 0.3)',
        'rgba(0, 145, 255, 0.3)',
        'rgba(250, 100, 0, 0.3)',
        'rgba(255, 255, 255, 0.1)',
        'rgba(98, 54, 255, 0.3)',
        'rgba(182, 32, 224, 0.3)',
    ],
    '600': [
        'rgba(224, 32, 32, 0.18)',
        'rgba(247, 181, 0, 0.18)',
        'rgba(109, 212, 0, 0.18)',
        'rgba(0, 145, 255, 0.18)',
        'rgba(250, 100, 0, 0.18)',
        'rgba(255, 255, 255, 0.06)',
        'rgba(98, 54, 255, 0.18)',
        'rgba(182, 32, 224, 0.18)',
    ],
    '400': [
        'rgba(224, 32, 32, 0.09)',
        'rgba(247, 181, 0, 0.09)',
        'rgba(109, 212, 0, 0.09)',
        'rgba(0, 145, 255, 0.09)',
        'rgba(250, 100, 0, 0.09)',
        'rgba(255, 255, 255, 0.03)',
        'rgba(98, 54, 255, 0.09)',
        'rgba(182, 32, 224, 0.09)',
    ],
    '100': [
        'rgba(224, 32, 32, 0.04)',
        'rgba(247, 181, 0, 0.04)',
        'rgba(109, 212, 0, 0.04)',
        'rgba(0, 145, 255, 0.04)',
        'rgba(250, 100, 0, 0.04)',
        'rgba(255, 255, 255, 0.01)',
        'rgba(98, 54, 255, 0.04)',
        'rgba(182, 32, 224, 0.04)',
    ],
}

export enum HoloLevels {
    _100 = '100',
    _400 = '400',
    _600 = '600',
    _900 = '900',
}

type HoloGradientProps = {
    size?: number
    level?: HoloLevels
    rounded?: boolean
}

const HoloGradient: React.FC<HoloGradientProps> = ({
    size,
    level = HoloLevels._900,
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
                colors={HOLO_GRADIENT_COLORS[level]}
                style={style}
            />
        </View>
    )
}

export default HoloGradient
