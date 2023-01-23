import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useCameraDevices } from 'react-native-vision-camera'

import { joinFederation, listFederations } from '../bridge'
import CameraPermissionsRequired from '../components/feature/scan/CameraPermissionsRequired'
import QrCodeScanner from '../components/feature/scan/QrCodeScanner'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import {
    updateFederations,
    useFederationsContext,
} from '../state/contexts/FederationsContext'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ScanFederationCode'
>

const ScanFederationCode: React.FC<Props> = ({ navigation }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const { dispatch } = useFederationsContext()
    const { toast } = useEnvironmentContext().state
    const [joiningFederation, setJoiningFederation] = useState<boolean>(false)

    const handleUserInput = useCallback(
        async (input: string) => {
            // tmuxinator
            // input =
            // '{"members":[[0,"wss://alpha.costa-regtest.dev.fedibtc.com/"],[1,"wss://beta.costa-regtest.dev.fedibtc.com/"],[2,"wss://charlie.costa-regtest.dev.fedibtc.com/"],[3,"wss://delta.costa-regtest.dev.fedibtc.com/"]]}'
            // '{"members":[[0,"wss://76242fcb4941.ngrok.io"],[1,"wss://8e6437f36982.ngrok.io"],[2,"wss://777e223bf7b3.ngrok.io"],[3,"wss://f9fed2a14599.ngrok.io/"]]}'
            console.log('input', input)
            // Provide a 500ms delay to throttle input from the scanner

            if (input.startsWith('{"members":')) {
                console.info('fedi qr code detected', input)

                if (joiningFederation === true) {
                    console.debug('duplicate join request blocked!')
                    return
                }

                try {
                    console.debug(
                        'setJoiningFederation(true) to prevent duplicate join requests',
                    )
                    setJoiningFederation(true)
                    console.debug('waiting for joinFederation to finish')
                    var federation = await joinFederation(input)
                    console.debug('joinFederation has finished')
                } catch (e) {
                    console.error('Failed to join federation', e)
                    console.debug(
                        'failure! allow join requests again due to error...',
                    )
                    setJoiningFederation(false)
                    return
                }
                const federations = await listFederations()
                if (federations.length > 0) {
                    console.log('navigating')
                    dispatch(updateFederations(federation.name, federations))
                    console.debug('success! allow join requests again...')
                    setJoiningFederation(false)
                    navigation.replace('Home')
                }
                setJoiningFederation(false) // just in case
            } else {
                toast?.show(t('invalid-federation-code'), 5000)
            }
        },
        [dispatch, joiningFederation, navigation, t, toast],
    )

    const checkClipboard = useCallback(async () => {
        const text = await Clipboard.getString()
        handleUserInput(text)
    }, [handleUserInput])

    const devices = useCameraDevices()
    const device = devices.back

    const renderQrCodeScanner = () => {
        if (device == null || joiningFederation === true) {
            return <ActivityIndicator />
        } else {
            return (
                <QrCodeScanner
                    device={device}
                    onQrCodeDetected={handleUserInput}
                    // Provide a 500ms delay to throttle input from the scanner
                    millisecondsToThrottle={500}
                />
            )
        }
    }

    return (
        <CameraPermissionsRequired
            alternativeActionButton={
                <Button
                    title={t(
                        'feature.federations.paste-federation-code-instead',
                    )}
                    onPress={checkClipboard}
                    type="clear"
                />
            }
            message={t('feature.federations.camera-access-information')}>
            <View style={styles(theme).container}>
                <View style={styles(theme).cameraScannerContainer}>
                    {renderQrCodeScanner()}
                </View>
                <Button
                    title={t('feature.federations.paste-federation-code')}
                    onPress={checkClipboard}
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
        },
        cameraScannerContainer: {
            height: '80%',
            width: '100%',
            margin: theme.spacing.lg,
        },
    })

export default ScanFederationCode
