import React from 'react'
import { StyleSheet, View } from 'react-native'

import SvgImage, { SvgImageSize } from './SvgImage'

const CircleLogo: React.FC = () => {
    return (
        <View style={styles().container}>
            <SvgImage size={SvgImageSize.lg} name="FediLogoIcon" />
        </View>
    )
}

const styles = () =>
    StyleSheet.create({
        container: {
            position: 'relative',
            alignItems: 'center',
            justifyContent: 'center',
            height: 32,
            width: 32,
        },
        holoCircle: {
            position: 'absolute',
            height: 32,
            width: 32,
            opacity: 1,
        },
    })

export default CircleLogo
