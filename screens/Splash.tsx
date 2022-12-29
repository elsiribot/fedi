import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { joinFederation, listFederations } from '../bridge'
import OnboardingSlides from '../components/feature/onboarding/OnboardingSlides'
import ProgressBar from '../components/feature/onboarding/ProgressBar'
import { TEST_FEDERATION } from '../constants'
import {
    changeSelectedFederation,
    updateConnectedFederations,
    useFederationsContext,
} from '../state/contexts/FederationsContext'
import { MAIN_NAVIGATOR_ID, RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>

const Splash: React.FC<Props> = ({ navigation }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const { dispatch } = useFederationsContext()
    const [page, setPage] = useState<number>(1)

    const connectToTestFederation = async () => {
        try {
            await joinFederation(TEST_FEDERATION)
        } catch (e) {
            console.error('Failed to join federation', e)
            return
        }
        const federations = await listFederations()
        if (federations.length > 0) {
            dispatch(updateConnectedFederations(federations))
            dispatch(changeSelectedFederation(federations[0]))
            navigation.getParent(MAIN_NAVIGATOR_ID)?.navigate('Home')
        }
    }

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
                    title={t('phrases.connect-to-federation')}
                    onPress={connectToTestFederation}
                    containerStyle={styles(theme).button}
                    type="clear"
                />
                <Button
                    fullWidth
                    title={t('feature.federations.join-federation')}
                    containerStyle={styles(theme).button}
                    onPress={handleJoinFederation}
                />
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
    })

export default Splash
