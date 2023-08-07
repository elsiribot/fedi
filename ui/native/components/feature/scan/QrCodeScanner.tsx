import React, { useEffect, useRef, useState } from 'react'
import { StyleSheet } from 'react-native'
import { Camera, CameraType } from 'react-native-camera-kit'

import { usePrevious } from '../../../state/hooks'

type QrCodeScanner = {
    onQrCodeDetected(data: string): void
}

const QrCodeScanner = ({ onQrCodeDetected }: QrCodeScanner) => {
    const [detectedQrData, setDetectedQrData] = useState<string>('')
    const previousQrData = usePrevious(detectedQrData)
    const cameraRef = useRef<Camera>(null)

    useEffect(() => {
        if (detectedQrData !== '' && detectedQrData !== previousQrData) {
            // TODO: imeplement a delay to throttle input from the scanner
            // if (throttling) return
            // setThrottling(true)
            // setTimeout(() => {
            //     setThrottling(false)
            //     onQrCodeDetected(b.content?.data)
            // }, millisecondsToThrottle)

            // Only call the detection function if QR data is different
            // but reset after a few seconds... in case some error occurs
            // and we should retry the same input
            onQrCodeDetected(detectedQrData)
            setTimeout(() => setDetectedQrData(''), 5000)
        }
    }, [detectedQrData, onQrCodeDetected, previousQrData])

    return (
        <Camera
            style={styles.camera}
            ref={cameraRef}
            cameraType={CameraType.Back}
            flashMode="auto"
            scanBarcode={true}
            onReadCode={(event: any) => {
                setDetectedQrData(event?.nativeEvent?.codeStringValue)
            }}
        />
    )
}

const styles = StyleSheet.create({
    camera: {
        height: '100%',
        width: '100%',
    },
})

export default QrCodeScanner
