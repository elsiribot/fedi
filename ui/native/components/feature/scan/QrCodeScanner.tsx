import { Text, Theme, useTheme } from '@rneui/themed'
import {
    areFramesComplete,
    framesToData,
    parseFramesReducer,
    progressOfFrames,
    State as FrameState,
} from 'qrloop'
import React, { useRef, useState } from 'react'
import { StyleSheet, Vibration, View } from 'react-native'
import { Camera, CameraType } from 'react-native-camera-kit'

import { useUpdatingRef } from '@fedi/common/hooks/util'

type QrCodeScanner = {
    onQrCodeDetected(data: string): void
}

const QrCodeScanner = ({ onQrCodeDetected }: QrCodeScanner) => {
    const { theme } = useTheme()
    const [frames, setFrames] = useState<FrameState | null>(null)
    const [progress, setProgress] = useState(0)
    const cameraRef = useRef<Camera>(null)
    const previousDataRef = useRef<string | null>(null)
    const previousDataTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
    const framesRef = useUpdatingRef(frames)

    const handleDetected = (data: string) => {
        // Only call the detection function if QR data is different
        // but reset after a few seconds... in case some error occurs
        // and we should retry the same input
        if (data === previousDataRef.current) return

        onQrCodeDetected(data)
        Vibration.vibrate(100)

        previousDataRef.current = data
        clearTimeout(previousDataTimeoutRef.current)
        previousDataTimeoutRef.current = setTimeout(() => {
            previousDataRef.current = null
        }, 5000)
    }

    const handleScan = (data: string) => {
        // Attempt to parse qrloop'd QR codes first
        try {
            const newFrames = parseFramesReducer(framesRef.current, data)
            if (areFramesComplete(newFrames)) {
                handleDetected(framesToData(newFrames).toString())
                // Reset frames & progress after short delay
                setTimeout(() => {
                    setFrames(null)
                    setProgress(0)
                }, 500)
            }
            setFrames(newFrames)
            setProgress(progressOfFrames(newFrames))
        } catch (err) {
            // Fall back to regular ol' QR code
            handleDetected(data)
        }
    }

    const style = styles(theme)
    return (
        <View style={style.container}>
            <Camera
                style={style.camera}
                ref={cameraRef}
                cameraType={CameraType.Back}
                flashMode="auto"
                scanBarcode={true}
                onReadCode={(event: any) =>
                    handleScan(event?.nativeEvent?.codeStringValue)
                }
            />
            {Boolean(progress) && (
                <View style={style.progressContainer}>
                    <View
                        style={[
                            style.progressBar,
                            { width: `${progress * 100}%` },
                        ]}
                    />
                    <Text tiny style={style.progressText}>
                        {Math.round(progress * 100)}%
                    </Text>
                </View>
            )}
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            position: 'relative',
            height: '100%',
            width: '100%',
        },
        camera: {
            height: '100%',
            width: '100%',
        },
        progressContainer: {
            position: 'absolute',
            bottom: theme.spacing.xl,
            left: theme.spacing.xl,
            right: theme.spacing.xl,
            height: 16,
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
            borderRadius: 8,
        },
        progressBar: {
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            height: '100%',
            backgroundColor: theme.colors.primary,
        },
        progressText: {
            top: 0,
            left: 0,
            lineHeight: 16,
            width: '100%',
            textAlign: 'center',
            color: theme.colors.secondary,
        },
    })

export default QrCodeScanner
