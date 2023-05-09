import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useRef } from 'react'
import {
    Animated,
    Easing,
    ImageBackground,
    StyleSheet,
    View,
    ViewStyle,
} from 'react-native'
import * as Progress from 'react-native-progress'

import { Images } from '../../assets/images'

export type Props = {
    label?: string
}

const HoloLoader: React.FC<Props> = ({ label }: Props) => {
    const { theme } = useTheme()
    const animatedSpin = useRef(new Animated.Value(0)).current

    useEffect(() => {
        Animated.loop(
            Animated.timing(animatedSpin, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: false,
                easing: Easing.ease,
            }),
        ).start()
    }, [])

    const spinInterpolation = animatedSpin.interpolate({
        inputRange: [0, 1],
        outputRange: ['360deg', '0deg'],
    })

    const transformedStyle: Animated.AnimatedProps<ViewStyle> = {
        transform: [{ rotate: spinInterpolation }],
    }

    return (
        <View style={[styles(theme).container]}>
            <ImageBackground
                source={Images.HoloBackgroundStrong}
                style={styles(theme).holoCircle}
                imageStyle={styles(theme).holoCircleImage}
            />
            <View style={styles(theme).whiteCircle} />
            <Animated.View
                style={[
                    styles(theme).progressCircleContainer,
                    transformedStyle,
                ]}>
                <Progress.Circle
                    progress={0.35}
                    color={theme.colors.white}
                    thickness={theme.sizes.progressCircleThickness}
                    size={theme.sizes.progressCircle}
                    borderWidth={1}
                />
            </Animated.View>

            <View style={styles(theme).percentLabelContainer}>
                <Text medium>{label}</Text>
            </View>
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            position: 'relative',
            alignItems: 'center',
            justifyContent: 'center',
            height: theme.sizes.progressCircle,
            width: theme.sizes.progressCircle,
        },
        progressCircleContainer: {
            position: 'absolute',
        },
        percentLabelContainer: {
            position: 'absolute',
        },
        holoCircle: {
            position: 'absolute',
            // Shaves a couple pixels off the holographic ring
            // to remove a thin border that appears while the white
            // progress ring is uncovering the holographic ring
            height: theme.sizes.progressCircle,
            width: theme.sizes.progressCircle,
        },
        holoCircleImage: {
            borderRadius: theme.sizes.progressCircle * 0.5,
        },
        whiteCircle: {
            position: 'absolute',
            height: theme.sizes.progressInnerCircle,
            width: theme.sizes.progressInnerCircle,
            borderRadius: theme.sizes.progressInnerCircle * 0.5,
            backgroundColor: theme.colors.white,
        },
    })

export default HoloLoader
