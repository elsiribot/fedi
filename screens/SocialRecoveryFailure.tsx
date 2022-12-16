import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Dimensions, ImageBackground, StyleSheet, View } from 'react-native'
import { Button, Image, Text, Theme, useTheme } from '@rneui/themed'

import type { RootStackParamList } from '../Router'
import { Images } from '../assets/images'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'SocialRecoveryFailure'
>

const SocialRecoveryFailure: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()

    return (
        <ImageBackground
            source={Images.HoloBackground}
            style={styles(theme).container}>
            <View style={styles(theme).detailsContainer}>
                <Image source={Images.Error} style={styles(theme).iconImage} />
                <Text h3 h3Style={styles(theme).failureMessage}>
                    {t('feature.recovery.social-recovery-unsuccessful')}
                </Text>
                <Text style={styles(theme).failureDetails}>
                    {t(
                        'feature.recovery.social-recovery-unsuccessful-instructions',
                    )}
                </Text>
            </View>
            <View style={styles(theme).buttonContainer}>
                <Button
                    type="clear"
                    title={t('phrases.back-to-app')}
                    containerStyle={styles(theme).backToAppButton}
                    onPress={() => {
                        navigation.navigate('Home')
                    }}
                />
                <Button
                    title={t('feature.recovery.try-social-recovery-again')}
                    onPress={() => {
                        navigation.navigate('LocateSocialRecovery')
                    }}
                />
            </View>
        </ImageBackground>
    )
}

const WINDOW_WIDTH = Dimensions.get('window').width
const CIRCLE_SIZE = WINDOW_WIDTH * 0.85

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
        detailsContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 'auto',
            paddingHorizontal: 24,
            backgroundColor: theme.colors.secondary,
            // for a perfect circle borderRadius should be half of
            // height and width
            height: CIRCLE_SIZE,
            width: CIRCLE_SIZE,
            borderRadius: CIRCLE_SIZE * 0.5,
            shadowRadius: 1,
            shadowOffset: {
                width: 0,
                height: 2,
            },
            elevation: 1,
            shadowColor: theme.colors.primaryLight,
        },
        iconImage: {
            height: theme.sizes.sm,
            width: theme.sizes.sm,
        },
        failureMessage: {
            textAlign: 'center',
            marginVertical: 10,
        },
        failureDetails: {
            textAlign: 'center',
            paddingHorizontal: 12,
        },
        backToAppButton: {
            marginBottom: 16,
        },
        buttonContainer: {
            width: '90%',
            marginTop: 'auto',
            marginBottom: 50,
            flexDirection: 'column',
            justifyContent: 'flex-end',
        },
    })

export default SocialRecoveryFailure
