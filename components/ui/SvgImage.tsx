import React from 'react'
import { View } from 'react-native'
import * as Svgs from '../../assets/images/svgs'

const SvgImage = ({ name, style, svgStyle }) => {
    const svgName = `${name}Svg`
    const Svg = Object(Svgs)[svgName]
    console.log(React.createElement(Svg, { ...svgStyle }))
    return (
        <View style={style}>{React.createElement(Svg, { ...svgStyle })}</View>
    )
}

export default SvgImage
