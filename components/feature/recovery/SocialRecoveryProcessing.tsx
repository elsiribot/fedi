import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { View, StyleSheet, ImageBackground, Dimensions } from 'react-native'
import { Images } from '../../../assets/images'

// TODO: Render within wallet if social recovery is in progress
const SocialRecoveryProcessing: React.FC<{}> = () => {
    const { t } = useTranslation()
    const { theme } = useTheme()

    return (
        <View style={styles(theme).container}>
            <View style={styles(theme).container}>
                <ImageBackground
                    source={Images.HoloBackground}
                    style={styles(theme).holoCircle}
                    imageStyle={styles(theme).circleBorder}>
                    <Text h4 h4Style={styles(theme).instructionsText}>
                        {'75%'}
                    </Text>
                </ImageBackground>
                <Text h3 h3Style={styles(theme).label}>
                    {t('feature.backup.creating-recovery-file')}
                </Text>
            </View>
        </View>
    )
}

const WINDOW_WIDTH = Dimensions.get('window').width
const CIRCLE_SIZE = WINDOW_WIDTH * 0.45

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing.lg,
        },
        label: {
            textAlign: 'center',
            marginVertical: theme.spacing.lg,
            paddingHorizontal: theme.spacing.xl,
        },
        instructionsText: {
            textAlign: 'center',
            paddingHorizontal: theme.spacing.xl,
            fontWeight: '400',
        },
        holoCircle: {
            height: CIRCLE_SIZE,
            width: CIRCLE_SIZE,
            alignItems: 'center',
            justifyContent: 'center',
        },
        circleBorder: {
            borderRadius: CIRCLE_SIZE * 0.5,
        },
        holoIconImage: {
            height: theme.sizes.lg,
            width: theme.sizes.lg,
        },
        roundedCardContainer: {
            borderRadius: theme.borders.defaultRadius,
            width: '100%',
            marginHorizontal: 0,
            padding: 0,
        },
        imageBackground: {
            padding: theme.spacing.lg,
        },
    })

export default SocialRecoveryProcessing
