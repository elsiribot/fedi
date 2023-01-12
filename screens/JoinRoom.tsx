import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Theme, useTheme } from '@rneui/themed'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useCameraDevices } from 'react-native-vision-camera'

import CameraPermissionsRequired from '../components/feature/scan/CameraPermissionsRequired'
import QrCodeScanner from '../components/feature/scan/QrCodeScanner'
import LineBreak from '../components/ui/LineBreak'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'JoinRoom'>

const JoinRoom: React.FC<Props> = ({ navigation }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const { toast } = useEnvironmentContext().state

    const handleUserInput = useCallback(
        async (input: string) => {
            if (input.startsWith('fedi:room:')) {
                console.info('fedi community room detected', input)
            } else {
                toast?.show(t('feature.community.invalid-room'), 3000)
            }
        },
        [navigation, toast, t],
    )

    const checkClipboard = useCallback(async () => {
        const text = await Clipboard.getString()
        handleUserInput(text)
    }, [handleUserInput])

    const createRoomInvite = () => {
        const char =
            'AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz1234567890'
        const random = Array.from(
            { length: 20 },
            () => char[Math.floor(Math.random() * char.length)],
        )
        const roomCode = random.join('')
        const roomLink = `fedi:room:${roomCode}`
        // TODO: room link should be a deep link with app download fallback
        navigation.navigate('RoomInvite', { roomLink })
    }

    const devices = useCameraDevices()
    const device = devices.back

    const renderQrCodeScanner = () => {
        if (device == null) {
            return <ActivityIndicator />
        } else {
            return (
                <QrCodeScanner
                    device={device}
                    onQrCodeDetected={(qrCodeData: string) => {
                        handleUserInput(qrCodeData)
                    }}
                />
            )
        }
    }

    return (
        <CameraPermissionsRequired
            alternativeActionButton={
                <>
                    <Button
                        title={t('phrases.paste-from-clipboard')}
                        onPress={checkClipboard}
                        type="clear"
                    />
                    <LineBreak />
                    <Button
                        title={t('feature.community.create-a-room')}
                        onPress={createRoomInvite}
                    />
                    <LineBreak />
                </>
            }
            message={t('feature.community.camera-access-information')}>
            <View style={styles(theme).container}>
                <View style={styles(theme).cameraScannerContainer}>
                    {renderQrCodeScanner()}
                </View>
                <Button
                    containerStyle={styles(theme).button}
                    title={t('feature.community.create-a-room')}
                    onPress={createRoomInvite}
                />
            </View>
        </CameraPermissionsRequired>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            // paddingVertical: theme.spacing.xl,
        },
        cameraScannerContainer: {
            height: '80%',
            width: '100%',
            margin: theme.spacing.lg,
        },
        button: {
            width: '90%',
        },
    })

export default JoinRoom
