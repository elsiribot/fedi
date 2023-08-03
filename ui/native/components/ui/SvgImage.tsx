import { useTheme } from '@rneui/themed'
import React from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'
import { SvgProps } from 'react-native-svg'

import * as Svgs from '../../assets/images/svgs'

export type SvgImageName = keyof typeof Svgs
export enum SvgImageSize {
    xs = 'xs',
    sm = 'sm',
    md = 'md',
    lg = 'lg',
    xl = 'xl',
}

type SvgImageProps = {
    name: SvgImageName
    size?: SvgImageSize | number
    containerStyle?: ViewStyle
    svgProps?: SvgProps
    color?: string
}

const SvgImage = ({
    name,
    size,
    containerStyle,
    svgProps,
    color,
}: SvgImageProps) => {
    const { theme } = useTheme()
    const Svg = Object(Svgs)[name]

    const svgSize = size || SvgImageSize.sm

    const defaultSvgProps = {
        color: color || theme.colors.primary,
        height: typeof svgSize === 'number' ? svgSize : theme.sizes[svgSize],
        width: typeof svgSize === 'number' ? svgSize : theme.sizes[svgSize],
    }
    const mergedSvgProps = {
        ...defaultSvgProps,
        ...svgProps,
    }

    const mergedStyles = [styles.container, containerStyle]

    return (
        <View style={mergedStyles}>
            {React.createElement(Svg, { ...mergedSvgProps })}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {},
})

export default SvgImage
