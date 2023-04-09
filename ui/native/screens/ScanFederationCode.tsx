import { fedimint } from '../bridge'
import CameraPermissionsRequired from '../components/feature/scan/CameraPermissionsRequired'
import QrCodeScanner from '../components/feature/scan/QrCodeScanner'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import {
    updateFederations,
    useFederationsContext,
} from '../state/contexts/FederationsContext'
import type { RootStackParamList } from '../types/navigation'
import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useCameraDevices } from 'react-native-vision-camera'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ScanFederationCode'
>

const ScanFederationCode: React.FC<Props> = ({ navigation }: Props) => {
    const insets = useSafeAreaInsets()
    const { theme } = useTheme()
    const { t } = useTranslation()
    const { state, dispatch } = useFederationsContext()
    const { toast } = useEnvironmentContext().state
    const [federationToJoin, setFederationToJoin] = useState<string>('')
    const [joiningComplete, setJoiningComplete] = useState<boolean>(false)

    useEffect(() => {
        const handleJoinFederation = async () => {
            try {
                const federation = await fedimint.joinFederation(
                    federationToJoin,
                )
                const federations = await fedimint.listFederations()
                if (federations.length > 0) {
                    dispatch(updateFederations(federation.id, federations))
                    setJoiningComplete(true)
                }
            } catch (e) {
                console.error(e)
                toast?.show(t('errors.failed-to-join-federation'), 5000)
            }
            setFederationToJoin('')
        }

        if (federationToJoin) {
            handleJoinFederation()
        }
    }, [dispatch, federationToJoin, t, toast])

    useEffect(() => {
        console.log(
            'effect',
            federationToJoin,
            state.selectedFederation,
            joiningComplete,
        )
        if (
            federationToJoin === '' &&
            state.selectedFederation &&
            // This is critical in case you are scanning to join multiple
            // federations so selectedFederation may still be non-null
            joiningComplete
        ) {
            navigation.replace('FederationWelcome')
        }
    }, [
        navigation,
        state.selectedFederation,
        federationToJoin,
        joiningComplete,
    ])

    const handleUserInput = useCallback(
        async (input: string) => {
            if (input.startsWith('fed1')) {
                console.info('fedi qr code detected', input)
                // Set the federation string to trigger the useEffect above
                setFederationToJoin(input)
            } else {
                toast?.show(t('errors.invalid-federation-code'), 5000)
            }
        },
        [t, toast],
    )

    const checkClipboard = useCallback(async () => {
        const text = await Clipboard.getString()
        handleUserInput(text.trim())
    }, [handleUserInput])

    const devices = useCameraDevices()
    const device = devices.back

    const renderQrCodeScanner = () => {
        if (device == null) {
            return <ActivityIndicator />
        } else if (federationToJoin !== '') {
            return null
        } else {
            return (
                <QrCodeScanner
                    device={device}
                    onQrCodeDetected={handleUserInput}
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
                    disabled={federationToJoin !== ''}
                    loading={federationToJoin !== ''}
                    type="clear"
                />
            }
            message={t('feature.federations.camera-access-information')}>
            <View style={styles(theme, insets).container}>
                <View style={styles(theme, insets).cameraScannerContainer}>
                    {renderQrCodeScanner()}
                </View>
                <View style={styles(theme, insets).buttonContainer}>
                    <Button
                        disabled={federationToJoin !== ''}
                        loading={federationToJoin !== ''}
                        title={t('feature.federations.paste-federation-code')}
                        onPress={checkClipboard}
                        fullWidth
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
        },
        cameraScannerContainer: {
            height: '80%',
            width: '100%',
            margin: theme.spacing.lg,
        },
        buttonContainer: {
            width: '100%',
            paddingHorizontal: theme.spacing.xl,
            marginTop: 'auto',
            marginBottom: theme.spacing.xl + insets.bottom,
        },
    })

export default ScanFederationCode
