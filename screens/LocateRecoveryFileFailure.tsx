import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Dimensions, ImageBackground, StyleSheet, View } from 'react-native'
import { Button, Image, Text, Theme, useTheme } from '@rneui/themed'

import type { RootStackParamList } from '../Router'
import { Images } from '../assets/images'
import LocateRecoveryFileButton from '../components/feature/recovery/LocateRecoveryFileButton'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'LocateRecoveryFileFailure'
>

const LocateRecoveryFileFailure: React.FC<Props> = ({
    navigation,
    route,
}: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { fileName } = route.params

    return (
        <ImageBackground
            source={Images.HoloBackground}
            style={styles(theme).container}>
            <View style={styles(theme).detailsContainer}>
                <Image source={Images.Error} style={styles(theme).iconImage} />
                <Text h3 h3Style={styles(theme).successMessage}>
                    {t('feature.recovery.opening-backup-file-failed')}
                </Text>
                <Text>
                    {t(
                        'feature.recovery.opening-backup-file-failed-instructions',
                        { fileName },
                    )}
                </Text>
            </View>
            <View style={styles(theme).buttonContainer}>
                <Button
                    title={t('phrases.back-to-app')}
                    onPress={() => {
                        navigation.navigate('Home')
                    }}
                />
                <LocateRecoveryFileButton />
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
            justifyContent: 'flex-end',
        },
        detailsContainer: {
            alignItems: 'center',
            justifyContent: 'center',
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
            marginVertical: 10,
            height: theme.sizes.sm,
            width: theme.sizes.sm,
        },
        successMessage: {
            textAlign: 'center',
        },
        buttonContainer: {
            width: '90%',
            height: '30%',
            marginBottom: 50,
            flexDirection: 'column',
            justifyContent: 'flex-end',
        },
    })

export default LocateRecoveryFileFailure
