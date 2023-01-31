import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import OnboardingSlides from '../components/feature/onboarding/OnboardingSlides'
import ProgressBar from '../components/feature/onboarding/ProgressBar'
import { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>

const Splash: React.FC<Props> = ({ navigation }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const [page, setPage] = useState<number>(1)

    const handleJoinFederation = async () => {
        navigation.navigate('ScanFederationCode')
    }

    return (
        <View style={styles(theme).container}>
            {/* TODO: Animate a full-screen HoloBackground to shrink down to
                the bounded circle in the HoloGuidance UI component as designed
                in Figma prototype
            */}
            {/* <ImageBackground
                resizeMode="cover"
                style={styles(theme).imageBackground}
                source={Images.HoloBackground}
            /> */}
            <View style={styles(theme).progressBarContainer}>
                <ProgressBar page={page} />
            </View>
            <View style={styles(theme).slidesContainer}>
                <OnboardingSlides
                    // When the slide changes, the page state is updated to provide
                    // the new page value to the ProgressBar
                    onSlideChanged={(slideNumber: number) =>
                        setPage(slideNumber)
                    }
                />
            </View>

            <View style={styles(theme).buttonsContainer}>
                <Button
                    fullWidth
                    title={t('feature.federations.join-federation')}
                    containerStyle={styles(theme).button}
                    onPress={handleJoinFederation}
                    titleStyle={styles(theme).titleButton}
                />
                <Text style={styles(theme).agreementText}>
                    {t('feature.onboarding.by-clicking-you-agree')}
                    <Text
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
            justifyContent: 'space-evenly',
            padding: theme.spacing.lg,
            marginTop: theme.spacing.xl,
        },
        progressBarContainer: {
            height: '5%',
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
        },
        slidesContainer: {
            height: '75%',
            width: '100%',
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
        imageBackground: {
            ...theme.styles.h100w100,
            display: 'none',
        },
        agreementLink: {
            color: theme.colors.link,
        },
        agreementText: {
            textAlign: 'center',
            marginVertical: theme.spacing.xl,
        },
        titleButton: {
            fontFamily: 'AlbertSans-Regular',
        },
    })

export default Splash
