import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native'
import { Camera } from 'react-native-vision-camera'
import { Button, Icon, Image, Text, Theme, useTheme } from '@rneui/themed'

import type {
    NavigationHook,
    RootStackParamList,
} from '../../../types/navigation'
import { Images } from '../../../assets/images'
import { useNavigation } from '@react-navigation/native'

export type RequestCameraAccessProps = {
    alternativeActionButton: React.ReactNode | null
    message: string | null
    nextScreen: keyof RootStackParamList
}

const RequestCameraAccess: React.FC<RequestCameraAccessProps> = ({
    alternativeActionButton,
    message,
    nextScreen,
}: RequestCameraAccessProps) => {
    const navigation = useNavigation<NavigationHook>()
    const { t } = useTranslation()
    const { theme } = useTheme()

    // first check if user has granted camera permissions
    useEffect(() => {
        const checkForPermissions = async () => {
            const status = await Camera.getCameraPermissionStatus()
            console.log('checkForPermissions: ', status)
            if (status === 'authorized') {
                navigation.replace(nextScreen)
            }
        }

        checkForPermissions()
    }, [navigation, nextScreen])

    const requestPermission = async () => {
        const requestResult = await Camera.requestCameraPermission()
        console.log('requestResult: ', requestResult)
        if (requestResult === 'authorized') {
            navigation.replace(nextScreen)
        }

        const status = await Camera.getCameraPermissionStatus()
        console.log('status:', status)
        // User explicitly denied... link to Settings instead
        if (status === 'denied') {
            Linking.openSettings()
        }
    }

    return (
        <View style={styles(theme).container}>
            <TouchableOpacity
                style={styles(theme).backIconContainer}
                onPress={() => navigation.goBack()}>
                <Icon
                    name="angle-left"
                    size={theme.sizes.md}
                    type="font-awesome"
                />
            </TouchableOpacity>
            <View style={styles(theme).instructions}>
                <Image
                    source={Images.AllowCameraAccessIcon}
                    style={styles(theme).image}
                />
                <Text h2 style={styles(theme).titleText}>
                    {t('phrases.allow-camera-access')}
                </Text>
                <Text style={styles(theme).subtitleText}>{message}</Text>
            </View>
            <View style={styles(theme).buttonsContainer}>
                {alternativeActionButton}
                <Button
                    title={t('phrases.allow-camera-access')}
                    onPress={requestPermission}
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
            justifyContent: 'space-between',
            paddingBottom: theme.spacing.xl,
        },
        backIconContainer: {
            marginTop: 100,
            paddingHorizontal: theme.spacing.xl,
            alignSelf: 'flex-start',
        },
        buttonsContainer: {
            width: '100%',
            height: 100,
            paddingHorizontal: theme.spacing.xl,
            justifyContent: 'space-between',
        },
        image: {
            height: 90,
            width: 90,
            resizeMode: 'contain',
        },
        instructions: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
        titleText: {
            fontWeight: '600',
            margin: theme.spacing.md,
        },
        subtitleText: {
            textAlign: 'center',
            marginHorizontal: theme.spacing.xl,
        },
    })

export default RequestCameraAccess
