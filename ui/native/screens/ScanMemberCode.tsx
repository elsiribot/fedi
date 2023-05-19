import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import { jid } from '@xmpp/client'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useCameraDevices } from 'react-native-vision-camera'

import { decodeDirectChatLink } from '@fedi/common/utils/xmpp'

import CameraPermissionsRequired from '../components/feature/scan/CameraPermissionsRequired'
import QrCodeScanner from '../components/feature/scan/QrCodeScanner'
import { XMPP_RESOURCE } from '../constants'
import { useChatContext } from '../state/contexts/ChatContext'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { Member } from '../types'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'ScanMemberCode'>

const ScanMemberCode: React.FC<Props> = ({ navigation }: Props) => {
    const insets = useSafeAreaInsets()
    const { theme } = useTheme()
    const { t } = useTranslation()
    const { toast } = useEnvironmentContext().state
    const { connectionOptions } = useChatContext().state

    const handleUserInput = useCallback(
        async (input: string) => {
            if (input.startsWith('fedi:member:')) {
                console.info('fedi chat member detected', input)
                // TODO: show chat unavailable
                if (!connectionOptions) {
                    return toast?.show(t('feature.chat.chat-unavailable'), 3000)
                }
                const memberId = decodeDirectChatLink(input)
                const memberJid = jid(
                    memberId,
                    connectionOptions.domain as string,
                    XMPP_RESOURCE,
                )

                navigation.replace('DirectChat', {
                    member: new Member({ jid: memberJid }),
                })
            } else {
                toast?.show(t('feature.chat.invalid-member'), 3000)
            }
        },
        [connectionOptions, navigation, toast, t],
    )

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
            alternativeActionButton={null}
            message={t('feature.chat.camera-access-information')}>
            <View style={styles(theme, insets).container}>
                <View style={styles(theme, insets).cameraScannerContainer}>
                    {renderQrCodeScanner()}
                </View>
            </View>
        </CameraPermissionsRequired>
    )
}

const styles = (theme: Theme, insets: EdgeInsets) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingTop: theme.spacing.lg,
        },
        // flex: 0 takes only the space it needs to render the buttons while
        // flex: 1 makes sure to take the remaining available space
        cameraScannerContainer: {
            flex: 1,
            width: '100%',
        },
        buttonsContainer: {
            flex: 0,
            justifyContent: 'flex-end',
            paddingHorizontal: theme.spacing.xl,
            width: '100%',
            marginTop: theme.spacing.xl,
            marginBottom: theme.spacing.xl + insets.bottom,
        },
        // adds space between the 2 buttons
        bottomButton: {
            marginTop: theme.spacing.lg,
        },
    })

export default ScanMemberCode
