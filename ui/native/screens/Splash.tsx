import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ImageBackground, StyleSheet, View } from 'react-native'

import { Images } from '../assets/images'
import SvgImage, { SvgImageSize } from '../components/ui/SvgImage'
import { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>

const Splash: React.FC<Props> = ({ navigation }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()

    const handleJoinFederation = async () => {
        navigation.navigate('ScanFederationCode')
    }

    return (
        <View style={styles(theme).container}>
            <View style={styles(theme).illustrationContainer}>
                <ImageBackground
                    resizeMode="contain"
                    style={styles(theme).illustrationImage}
                    source={Images.IllustrationWorld}
                />
            </View>
            <View style={styles(theme).welcomeContainer}>
                <SvgImage size={SvgImageSize.md} name="FediLogoIcon" />
                <Text h2 medium>
                    {t('feature.onboarding.welcome-to-fedi')}
                </Text>
                <Text style={styles(theme).welcomeText}>
                    {t('feature.onboarding.guidance-1')}
                </Text>
            </View>

            <View style={styles(theme).buttonsContainer}>
                <Button
                    fullWidth
                    testID="JoinFederationButton"
                    title={t('feature.federations.join-federation')}
                    containerStyle={styles(theme).button}
                    onPress={handleJoinFederation}
                />
                <Text style={styles(theme).agreementText} small>
                    {t('feature.onboarding.by-clicking-you-agree')}
                    <Text
                        small
                        style={styles(theme).agreementLink}
                        onPress={() => {
                            navigation.navigate('Eula')
                        }}>
                        {` ${t('phrases.user-agreement')}`}
                    </Text>
                </Text>
            </View>
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: theme.spacing.lg,
            marginVertical: theme.spacing.xl,
        },
        buttonsContainer: {
            height: '20%',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'space-evenly',
        },
        button: {
            marginVertical: theme.spacing.sm,
        },
        illustrationContainer: {
            height: '50%',
            alignItem: 'center',
            justifyContent: 'center',
            width: '100%',
            marginVertical: theme.spacing.md,
        },
        illustrationImage: {
            minHeight: theme.sizes.splashImageSize,
            minWidth: theme.sizes.splashImageSize,
            width: '100%',
            transform: [
                {
                    scale: 1.5,
                },
            ],
        },
        welcomeContainer: {
            height: '20%',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'space-evenly',
            paddingHorizontal: theme.spacing.xl,
            marginVertical: theme.spacing.md,
        },
        welcomeText: {
            textAlign: 'center',
        },
        agreementLink: {
            color: theme.colors.link,
        },
        agreementText: {
            textAlign: 'center',
            width: '70%',
            marginVertical: theme.spacing.xl,
        },
    })

export default Splash
