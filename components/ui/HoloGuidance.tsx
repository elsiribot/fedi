import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import {
    ImageBackground,
    ImageSourcePropType,
    StyleSheet,
    View,
} from 'react-native'

import { Images } from '../../assets/images'

type HoloGuidanceProps = {
    iconImage?: ImageSourcePropType | null
    title?: string | null
    message?: string | null
    body?: React.ReactNode | null
}

const HoloGuidance: React.FC<HoloGuidanceProps> = ({
    iconImage = null,
    title,
    message,
    body,
}: HoloGuidanceProps) => {
    const { theme } = useTheme()

    return (
        <View style={styles(theme).container}>
            <ImageBackground
                source={Images.HoloBackground}
                style={styles(theme).holoCircle}
                imageStyle={styles(theme).circleBorder}>
                {iconImage}
            </ImageBackground>
            {body ? (
                body
            ) : (
                <>
                    <Text h2 h2Style={styles(theme).title}>
                        {title}
                    </Text>
                    <Text style={styles(theme).message}>{message}</Text>
                </>
            )}
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
        title: {
            textAlign: 'center',
            marginVertical: theme.spacing.md,
        },
        message: {
            textAlign: 'center',
            paddingHorizontal: theme.spacing.xl,
            fontWeight: '400',
        },
        holoCircle: {
            height: theme.sizes.holoGuidanceCircle,
            width: theme.sizes.holoGuidanceCircle,
            alignItems: 'center',
            justifyContent: 'center',
        },
        circleBorder: {
            borderRadius: theme.sizes.holoGuidanceCircle * 0.5,
        },
        iconImage: {
            height: theme.sizes.lg,
            width: theme.sizes.lg,
        },
        continueButton: {
            width: '100%',
            marginVertical: theme.spacing.md,
        },
    })

export default HoloGuidance
