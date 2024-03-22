import { Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { ImageBackground, StyleSheet, View } from 'react-native'

import { Images } from '../../assets/images'
import SvgImage, { SvgImageSize } from './SvgImage'

const CircleLogo: React.FC = () => {
    const { theme } = useTheme()

    return (
        <View style={styles(theme).container}>
            <ImageBackground
                source={Images.HoloRing}
                style={styles(theme).holoCircle}
            />
            <SvgImage
                size={SvgImageSize.lg}
                name="FediLogoIcon"
            />
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            position: 'relative',
            alignItems: 'center',
            justifyContent: 'center',
            height: theme.sizes.logoRingSize,
            width: theme.sizes.logoRingSize,
        },
        holoCircle: {
            position: 'absolute',
            height: theme.sizes.logoRingSize,
            width: theme.sizes.logoRingSize,
            opacity: 1,
        },
        welcomeIcon: {
            borderWidth: 1,
            position: 'absolute',
            top: 0,
            left: 0,
        },
    })

export default CircleLogo
