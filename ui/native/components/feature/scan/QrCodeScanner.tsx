import React, { useEffect, useState } from 'react'
import { StyleSheet } from 'react-native'
import { Camera, CameraDevice } from 'react-native-vision-camera'
import { BarcodeFormat, useScanBarcodes } from 'vision-camera-code-scanner'

import { usePrevious } from '../../../state/hooks'

type QrCodeScanner = {
    device: CameraDevice
    onQrCodeDetected: Function
}

const QrCodeScanner = ({ device, onQrCodeDetected }: QrCodeScanner) => {
    const [detectedQrData, setDetectedQrData] = useState<string>('')
    const previousQrData = usePrevious(detectedQrData)
    const [frameProcessor, barcodes] = useScanBarcodes(
        [BarcodeFormat.QR_CODE],
        {
            checkInverted: true,
        },
    )

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

    useEffect(() => {
        barcodes.map(b => {
            setDetectedQrData(b.content?.data as string)
        })
    }, [barcodes])

    return (
        <Camera
            style={styles.camera}
            device={device}
            isActive={true}
            frameProcessor={frameProcessor}
            frameProcessorFps={2}
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
