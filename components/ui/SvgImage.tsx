import { useTheme } from '@rneui/themed'
import React from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'
import { SvgProps } from 'react-native-svg'
import * as Svgs from '../../assets/images/svgs'

type SvgImageProps = {
    name: string
    containerStyle?: ViewStyle
    svgProps?: SvgProps
}

const SvgImage = ({ name, containerStyle, svgProps }: SvgImageProps) => {
    const { theme } = useTheme()
    const svgName = `${name}Svg`
    const Svg = Object(Svgs)[svgName]

    const defaultSvgProps = {
        stroke: theme.colors.primary,
        height: theme.sizes.sm,
        width: theme.sizes.sm,
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
