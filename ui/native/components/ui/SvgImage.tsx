import { useTheme } from '@rneui/themed'
import React from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'
import { SvgProps } from 'react-native-svg'
import * as Svgs from '../../assets/images/svgs'

export enum SvgImageSize {
    xs = 'xs',
    sm = 'sm',
    md = 'md',
    lg = 'lg',
    xl = 'xl',
}
type SvgImageProps = {
    name: string
    size?: SvgImageSize
    containerStyle?: ViewStyle
    svgProps?: SvgProps
}

const SvgImage = ({ name, size, containerStyle, svgProps }: SvgImageProps) => {
    const { theme } = useTheme()
    const svgName = `${name}Svg`
    const Svg = Object(Svgs)[svgName]

    const svgSize = size || SvgImageSize.sm

    const defaultSvgProps = {
        stroke: theme.colors.primary,
        height: theme.sizes[svgSize],
        width: theme.sizes[svgSize],
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
