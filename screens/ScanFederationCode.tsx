import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useCameraDevices } from 'react-native-vision-camera'
import { Button } from '@rneui/themed'

import type { RootStackParamList } from '../Router'
import QrCodeScanner from '../components/feature/scan/QrCodeScanner'
import {
    changeSelectedFederation,
    updateConnectedFederations,
    useFederationsContext,
} from '../contexts/FederationsContext'
import { joinFederation, listFederations } from '../bridge'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ScanFederationCode'
>

const ScanFederationCode: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { state, dispatch } = useFederationsContext()

    async function handleUserInput(input: string) {
        if (input.startsWith('{"members":')) {
            console.log('fedi qr code detected', input)
            try {
                await joinFederation(input)
            } catch (e) {
                console.error('Failed to join federation', e)
                return
            }
            const federations = await listFederations()
            if (federations.length > 0) {
                dispatch(updateConnectedFederations(federations))
                dispatch(changeSelectedFederation(federations[0]))
                navigation.navigate('Home')
            }
        } else {
            // TODO: display invalid federation code error toast
        }
    }

    const checkClipboard = async () => {
        const text = await Clipboard.getString()
        handleUserInput(text)
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
        <View style={styles.container}>
            <View style={styles.cameraScannerContainer}>
                {renderQrCodeScanner()}
            </View>
            <Button
                title={t('feature.federations.paste-federation-code')}
                onPress={checkClipboard}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cameraScannerContainer: {
        height: '80%',
        width: '100%',
        margin: 16,
    },
    camera: {
        height: '100%',
        width: '100%',
    },
})

export default ScanFederationCode
