import React from 'react'
import {
    ImageBackground,
    ImageSourcePropType,
    StyleSheet,
    View,
} from 'react-native'
import { Image, Text, Theme, useTheme } from '@rneui/themed'
import { Images } from '../../assets/images'

type HoloCardProps = {
    iconImage?: ImageSourcePropType | null
    title?: string | null
    body: React.ReactNode
}

const HoloCard: React.FC<HoloCardProps> = ({
    iconImage = null,
    title = null,
    body,
}: HoloCardProps) => {
    const { theme } = useTheme()

    return (
        <ImageBackground
            source={Images.HoloBackground}
            style={styles(theme).container}
            imageStyle={styles(theme).roundedBorder}>
            <View style={styles(theme).innerContainer}>
                {iconImage && (
                    <Image source={iconImage} style={styles(theme).iconImage} />
                )}
                {title && (
                    <Text h4 h4Style={styles(theme).titleText}>
                        {title}
                    </Text>
                )}
                {body}
            </View>
        </ImageBackground>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            width: '100%',
            alignItems: 'center',
            marginVertical: theme.spacing.sm,
        },
        iconImage: {
            height: theme.sizes.sm,
            width: theme.sizes.sm,
        },
        innerContainer: {
            width: '100%',
            alignItems: 'center',
            padding: theme.spacing.xl,
        },
        roundedBorder: {
            borderRadius: theme.borders.defaultRadius,
        },
        titleText: {
            marginVertical: theme.spacing.lg,
        },
    })

export default HoloCard
