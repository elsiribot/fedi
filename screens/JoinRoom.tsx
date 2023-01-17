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
import { DEFAULT_ROOM_NAME } from '../constants'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useXmpp } from '../state/hooks'
import { Room } from '../types'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'JoinRoom'>

const JoinRoom: React.FC<Props> = ({ navigation }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const { toast } = useEnvironmentContext().state
    const { getUniqueRoomName } = useXmpp()

    const handleUserInput = useCallback(
        async (input: string) => {
            if (input.startsWith('fedi:room:')) {
                console.info('fedi community room detected', input)
                navigation.replace('Room', {
                    room: Room.decodeInvitationLink(input),
                })
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

    const createRoomInvite = async () => {
        const roomCode = await getUniqueRoomName()
        const roomName = DEFAULT_ROOM_NAME
        const roomLink = Room.encodeInvitationLink(roomCode, roomName)

        // TODO: room link should be a deep link with app download fallback
        navigation.replace('RoomInvite', {
            room: new Room({
                id: roomCode,
                name: roomName,
                invitationCode: roomLink,
            }),
        })
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
                    title={t('phrases.paste-from-clipboard')}
                    onPress={checkClipboard}
                    type="clear"
                />
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
            paddingBottom: theme.spacing.lg,
        },
        cameraScannerContainer: {
            height: '75%',
            width: '100%',
            margin: theme.spacing.lg,
        },
        button: {
            width: '90%',
            marginBottom: theme.spacing.md,
        },
    })

export default JoinRoom
