import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Theme, useTheme } from '@rneui/themed'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'

import { joinChatGroup } from '@fedi/common/redux'

import CameraPermissionsRequired from '../components/feature/scan/CameraPermissionsRequired'
import QrCodeScanner from '../components/feature/scan/QrCodeScanner'
import LineBreak from '../components/ui/LineBreak'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'JoinGroup'>

const JoinGroup: React.FC<Props> = ({ navigation }: Props) => {
    const insets = useSafeAreaInsets()
    const { theme } = useTheme()
    const { t } = useTranslation()
    const { toast } = useEnvironmentContext().state
    const activeFederationId = useAppSelector(
        s => s.federation.activeFederationId,
    )
    const dispatch = useAppDispatch()

    const handleUserInput = useCallback(
        async (input: string) => {
            if (!activeFederationId) return
            if (input.startsWith('fedi:group:')) {
                console.info('fedi chat group detected', input)
                try {
                    const res = await dispatch(
                        joinChatGroup({
                            federationId: activeFederationId,
                            link: input,
                        }),
                    ).unwrap()
                    navigation.replace('GroupChat', {
                        groupId: res.id,
                    })
                } catch (error) {
                    toast?.show(t('errors.chat-unavailable'), 3000)
                }
            } else {
                toast?.show(t('feature.chat.invalid-group'), 3000)
            }
        },
        [dispatch, activeFederationId, navigation, toast, t],
    )

    const checkClipboard = useCallback(async () => {
        const text = await Clipboard.getString()
        handleUserInput(text.trim())
    }, [handleUserInput])

    const renderQrCodeScanner = () => {
        return (
            <QrCodeScanner
                onQrCodeDetected={(qrCodeData: string) => {
                    handleUserInput(qrCodeData)
                }}
            />
        )
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
                        title={t('feature.chat.create-a-group')}
                        onPress={() => navigation.replace('CreateGroup')}
                    />
                    <LineBreak />
                </>
            }
            message={t('feature.chat.camera-access-information')}>
            <View style={styles(theme, insets).container}>
                <View style={styles(theme, insets).cameraScannerContainer}>
                    {renderQrCodeScanner()}
                </View>
                <View style={styles(theme, insets).buttonsContainer}>
                    <Button
                        fullWidth
                        title={t('phrases.paste-from-clipboard')}
                        onPress={checkClipboard}
                        type="clear"
                    />
                    <Button
                        fullWidth
                        title={t('feature.chat.create-a-group')}
                        onPress={() => navigation.replace('CreateGroup')}
                        containerStyle={styles(theme, insets).bottomButton}
                    />
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

export default JoinGroup
