import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, StyleSheet, View } from 'react-native'
import { Camera } from 'react-native-vision-camera'

import { useEffect, useState } from 'react'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'

export type RequestCameraAccessProps = {
    alternativeActionButton: React.ReactNode | null
    message: string | null
    onAccessGranted?: () => void | null
    requireMicrophone?: boolean
}

const RequestCameraAccess: React.FC<RequestCameraAccessProps> = ({
    alternativeActionButton,
    message,
    onAccessGranted,
    requireMicrophone = false,
}: RequestCameraAccessProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const [permissionsGranted, setPermissionsGranted] = useState<string[]>([])

    useEffect(() => {
        if (
            requireMicrophone === true &&
            permissionsGranted.includes('CAMERA') &&
            permissionsGranted.includes('MICROPHONE')
        ) {
            onAccessGranted && onAccessGranted()
        }
        if (
            requireMicrophone === false &&
            permissionsGranted.includes('CAMERA')
        ) {
            onAccessGranted && onAccessGranted()
        }
    }, [onAccessGranted, permissionsGranted, requireMicrophone])

    const requestCameraPermission = async () => {
        const requestResult = await Camera.requestCameraPermission()
        console.info('cameraRequestResult: ', requestResult)
        if (requestResult === 'authorized') {
            setPermissionsGranted([...permissionsGranted, 'CAMERA'])
        }

        const status = await Camera.getCameraPermissionStatus()
        console.info('cameraRequestResult:', status)
        // User explicitly denied... link to Settings instead
        if (status === 'denied') {
            Linking.openSettings()
        }
    }

    const requestMicrophonePermission = async () => {
        const requestResult = await Camera.requestMicrophonePermission()
        console.info('microphoneRequestResult: ', requestResult)
        if (requestResult === 'authorized') {
            setPermissionsGranted([...permissionsGranted, 'MICROPHONE'])
        }

        const status = await Camera.getMicrophonePermissionStatus()
        console.info('microphoneRequestResult:', status)
        // User explicitly denied... link to Settings instead
        if (status === 'denied') {
            Linking.openSettings()
        }
    }

    const requestPermissions = async () => {
        await requestCameraPermission()
        if (requireMicrophone === true) {
            await requestMicrophonePermission()
        }
    }

    return (
        <View style={styles(theme).container}>
            <View style={styles(theme).instructions}>
                <SvgImage name="AllowCameraAccessIcon" size={SvgImageSize.lg} />
                <Text h2 style={styles(theme).titleText}>
                    {t('phrases.allow-camera-access')}
                </Text>
                <Text style={styles(theme).subtitleText}>{message}</Text>
            </View>
            <View style={styles(theme).buttonsContainer}>
                {alternativeActionButton}
                <Button
                    title={t('phrases.allow-camera-access')}
                    onPress={requestPermissions}
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
            marginTop: 20,
            paddingHorizontal: theme.spacing.xl,
            alignSelf: 'flex-start',
        },
        buttonsContainer: {
            width: '100%',
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
