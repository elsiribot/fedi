import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Image, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { View, StyleSheet, ImageBackground, Dimensions } from 'react-native'

import { Images } from '../assets/images'
import { useFederationsContext } from '../contexts/FederationsContext'

import type { RootStackParamList } from '../Router'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ChooseRecoveryMethod'
>

const ChooseRecoveryMethod: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { selectedFederation } = useFederationsContext().state

    return (
        <View style={styles(theme).container}>
            <Text h4 h4Style={styles(theme).instructionsText}>
                {t('feature.recovery.choose-method-instructions', {
                    federation: selectedFederation?.name,
                })}
            </Text>
            <ImageBackground
                source={Images.HoloBackground}
                style={styles(theme).recoveryMethodContainer}
                imageStyle={styles(theme).imageBackgroundBorder}>
                <Image
                    source={Images.SocialPeople}
                    style={styles(theme).iconImage}
                />
                <Text h4 h4Style={styles(theme).recoveryMethodLabel}>
                    {t('feature.recovery.social-recovery')}
                </Text>
                <Text h4 h4Style={styles(theme).recoveryMethodInstructions}>
                    {t('feature.recovery.social-recovery-method')}
                </Text>
                <Button
                    title={t('feature.recovery.start-social-recovery')}
                    containerStyle={styles(theme).recoveryMethodButton}
                    onPress={() => navigation.navigate('LocateSocialRecovery')}
                />
            </ImageBackground>
            <ImageBackground
                source={Images.HoloBackground}
                style={styles(theme).recoveryMethodContainer}
                imageStyle={styles(theme).imageBackgroundBorder}>
                <Image source={Images.Note} style={styles(theme).iconImage} />
                <Text h4 h4Style={styles(theme).recoveryMethodLabel}>
                    {t('feature.recovery.personal-recovery')}
                </Text>
                <Text h4 h4Style={styles(theme).recoveryMethodInstructions}>
                    {t('feature.recovery.personal-recovery-method')}
                </Text>
                <Button
                    title={t('feature.recovery.start-personal-recovery')}
                    containerStyle={styles(theme).recoveryMethodButton}
                    onPress={() => {
                        // navigation.navigate('StartPersonalRecovery')
                    }}
                    disabled
                />
            </ImageBackground>
        </View>
    )
}

const WINDOW_WIDTH = Dimensions.get('window').width
const CARD_WIDTH = WINDOW_WIDTH * 0.85

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: 24,
        },
        imageBackgroundBorder: {
            borderRadius: 12,
        },
        iconImage: {
            height: theme.sizes.sm,
            width: theme.sizes.sm,
        },
        instructionsText: {
            textAlign: 'center',
            paddingHorizontal: 12,
            fontWeight: '400',
        },
        recoveryMethodContainer: {
            width: CARD_WIDTH,
            alignItems: 'center',
            padding: 24,
            marginVertical: 24,
            justifyContent: 'space-between',
        },
        recoveryMethodLabel: {
            paddingTop: 16,
        },
        recoveryMethodInstructions: {
            textAlign: 'center',
            fontWeight: '400',
            paddingTop: 16,
        },
        recoveryMethodButton: {
            width: '100%',
            marginTop: 16,
        },
    })

export default ChooseRecoveryMethod
