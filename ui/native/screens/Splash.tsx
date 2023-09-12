import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ImageBackground, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Images } from '../assets/images'
import SvgImage, { SvgImageSize } from '../components/ui/SvgImage'
import { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>

const Splash: React.FC<Props> = ({ navigation }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()

    const handleJoinFederation = async () => {
        navigation.navigate('JoinFederation', { invite: undefined })
    }

    return (
        <SafeAreaView style={styles(theme).container}>
            <View style={styles(theme).illustrationContainer}>
                <ImageBackground
                    resizeMode="contain"
                    style={styles(theme).illustrationImageBlurred}
                    source={Images.IllustrationWorld}
                    blurRadius={20}
                />
                <ImageBackground
                    resizeMode="contain"
                    style={styles(theme).illustrationImage}
                    source={Images.IllustrationWorld}
                />
            </View>
            <View style={styles(theme).welcomeContainer}>
                <SvgImage
                    containerStyle={styles(theme).welcomeIcon}
                    size={SvgImageSize.md}
                    name="FediLogoIcon"
                />
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
        </SafeAreaView>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.spacing.lg,
            padding: theme.spacing.lg,
        },
        buttonsContainer: {
            width: '100%',
            alignItems: 'center',
            justifyContent: 'space-evenly',
            gap: theme.spacing.xl,
        },
        illustrationContainer: {
            position: 'relative',
            flex: 1,
            flexShrink: 1,
            maxHeight: theme.sizes.splashImageSize,
            alignItem: 'center',
            justifyContent: 'center',
            width: '100%',
        },
        illustrationImage: {
            position: 'absolute',
            height: '100%',
            width: '100%',
            transform: [
                {
                    scale: 1,
                },
            ],
        },
        illustrationImageBlurred: {
            position: 'absolute',
            height: '100%',
            width: '100%',
            opacity: 0.5,
            transform: [
                {
                    scale: 1.05,
                },
            ],
        },
        welcomeContainer: {
            width: '100%',
            maxWidth: 320,
            alignItems: 'center',
            justifyContent: 'space-evenly',
            gap: theme.spacing.sm,
            paddingHorizontal: theme.spacing.xl,
        },
        welcomeIcon: {
            marginBottom: theme.spacing.sm,
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
            color: theme.colors.grey,
        },
    })

export default Splash
