import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native'
import { Camera } from 'react-native-vision-camera'
import { Button, Icon, Image, Text, useTheme } from '@rneui/themed'

import type { RootStackParamList } from '../Router'
import { Images } from '../assets/images'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'RequestCameraAccess'
>

const RequestCameraAccess: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const [hasCameraPermission, setHasCameraPermission] = React.useState(false)

    // first check if user has granted camera permissions
    useEffect(() => {
        const checkForPermissions = async () => {
            const status = await Camera.getCameraPermissionStatus()
            console.log('checkForPermissions: ', status)
            setHasCameraPermission(status === 'authorized')
        }

        checkForPermissions()
    }, [])

    useEffect(() => {
        if (hasCameraPermission) {
            console.log('access granted')
        }
    }, [hasCameraPermission])

    const requestPermission = async () => {
        const status = await Camera.getCameraPermissionStatus()
        // User explicitly denied, link to Settings
        console.log('requestPermission: ', status)
        if (status === 'denied') {
            Linking.openSettings()
        } else {
            const result = await Camera.requestCameraPermission()
            setHasCameraPermission(result === 'authorized')
        }
    }

    const checkClipboard = async () => {
        const text = await Clipboard.getString()
        if (text.startsWith('fedi:')) {
            console.log('fedi qr code detected')
        }
    }

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.backIconContainer}
                onPress={() => navigation.goBack()}>
                <Icon
                    name="angle-left"
                    size={theme.sizes.md}
                    type="font-awesome"
                />
            </TouchableOpacity>
            <View style={styles.instructions}>
                <Image
                    source={Images.AllowCameraAccessIcon}
                    style={styles.image}
                />
                <Text h3 style={styles.titleText}>
                    {t('phrases.allow-camera-access')}
                </Text>
                <Text style={styles.subtitleText}>
                    {t('feature.federations.camera-access-information')}
                </Text>
            </View>
            <View style={styles.buttonsContainer}>
                <Button
                    title={t('phrases.allow-camera-access')}
                    onPress={requestPermission}
                />
                <Button
                    title={t(
                        'feature.federations.paste-federation-code-instead',
                    )}
                    onPress={checkClipboard}
                    type="clear"
                />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 32,
    },
    backIconContainer: {
        marginTop: 100,
        paddingHorizontal: 24,
        alignSelf: 'flex-start',
    },
    buttonsContainer: {
        width: '100%',
        height: 100,
        paddingHorizontal: 24,
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
        margin: 16,
    },
    subtitleText: {
        textAlign: 'center',
        marginHorizontal: 32,
    },
})

export default RequestCameraAccess
