import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Image, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { View, StyleSheet, ImageBackground, Dimensions } from 'react-native'

import { Images } from '../assets/images'

import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'StartSocialBackup'
>

const StartSocialBackup: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()

    return (
        <View style={styles(theme).container}>
            <View style={styles(theme).container}>
                <ImageBackground
                    source={Images.HoloBackground}
                    style={styles(theme).holoCircle}
                    imageStyle={styles(theme).circleBorder}>
                    <Image
                        source={Images.WordList}
                        style={styles(theme).holoIconImage}
                    />
                </ImageBackground>
                <Text h3 h3Style={styles(theme).label}>
                    {t('feature.backup.social-backup')}
                </Text>
                <Text h4 h4Style={styles(theme).instructionsText}>
                    {t('feature.backup.start-social-backup-instructions')}
                </Text>
            </View>
            <Button
                title={t('words.next')}
                containerStyle={styles(theme).continueButton}
                onPress={() => {
                    navigation.navigate('RecordBackupVideo')
                }}
            />
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
            padding: theme.spacing.xl,
        },
        label: {
            textAlign: 'center',
            marginVertical: theme.spacing.lg,
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
        continueButton: {
            width: '100%',
            marginVertical: theme.spacing.lg,
        },
    })

export default StartSocialBackup
