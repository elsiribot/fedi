import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, StyleSheet, View } from 'react-native'

import AnimatedQrCodeScanner from '../components/feature/scan/AnimatedQrCodeScanner'
import CameraPermissionsRequired from '../components/feature/scan/CameraPermissionsRequired'
import { useBridge } from '../state/hooks'
import { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'ReceiveOffline'>

const ReceiveOffline: React.FC<Props> = ({ navigation }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const { validateEcash } = useBridge()
    const [validating, setValidating] = useState(false)
    const [showingError, setShowingError] = useState(false)
    const [percent, setPercent] = useState(0)

    const renderQrCodeScanner = () => {
        return (
            <AnimatedQrCodeScanner
                onProgress={(p: number) => {
                    if (p > percent) setPercent(p)
                }}
                onQrCodeDetected={onResult}
            />
        )
    }

    const onResult = async (ecash: string) => {
        // `!validating` so we don't call multiple times
        // `!showingError` so we don't stack error alerts
        if (!validating && !showingError) {
            setValidating(true)
            try {
                const { valid, amount } = await validateEcash(ecash)
                if (valid) {
                    navigation.replace('ConfirmReceiveOffline', {
                        amount,
                        ecash,
                    })
                } else {
                    Alert.alert(t('words.error'), 'Invalid ecash tokens', [
                        {
                            text: t('words.done'),
                            onPress: () => setShowingError(false),
                        },
                    ])
                }
            } catch (e: any) {
                setShowingError(true)
                // this happens when the QR code doesn't contain valid tokens
                Alert.alert(t('words.error'), e.message, [
                    {
                        text: t('words.done'),
                        onPress: () => setShowingError(false),
                    },
                ])
            }
            setValidating(false)
        }
    }

    return (
        <CameraPermissionsRequired
            alternativeActionButton={null}
            message={t('feature.receive.camera-access-information')}>
            <View style={styles(theme).container}>
                <View style={styles(theme).cameraScannerContainer}>
                    {renderQrCodeScanner()}
                </View>
                <Text>{`${(percent * 100).toFixed(2)}%`}</Text>
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
            margin: theme.spacing.md,
        },
    })

export default ReceiveOffline
