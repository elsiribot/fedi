import React, { useEffect, useState } from 'react'
import { StyleSheet } from 'react-native'
import { Camera, CameraDevice } from 'react-native-vision-camera'
import { BarcodeFormat, useScanBarcodes } from 'vision-camera-code-scanner'
import {
    parseFramesReducer,
    areFramesComplete,
    framesToData,
    progressOfFrames,
    State as FrameState,
} from 'qrloop'

type QrCodeScanner = {
    device: CameraDevice
    onQrCodeDetected: Function
    onProgress: Function
}

const QrCodeScanner = ({
    device,
    onQrCodeDetected,
    onProgress,
}: QrCodeScanner) => {
    const [frameProcessor, barcodes] = useScanBarcodes(
        [BarcodeFormat.QR_CODE],
        {
            checkInverted: true,
        },
    )
    const [frames, setFrames] = useState<FrameState | null>(null)

    useEffect(() => {
        barcodes.map(b => {
            const updatedFrames = parseFramesReducer(
                frames,
                b.content?.data as string,
            )

            // Report progress
            const updatedProgress = progressOfFrames(updatedFrames)
            onProgress(updatedProgress)

            // To prevent infinite loops ...
            if (progressOfFrames(frames) !== updatedProgress) {
                setFrames(updatedFrames)
                if (areFramesComplete(updatedFrames)) {
                    onQrCodeDetected(framesToData(updatedFrames).toString())
                    // reset frames once we've found a hit ...
                    setFrames(null)
                } else {
                    console.log('Progress:', progressOfFrames(updatedFrames))
                }
            }
        })
    }, [barcodes, frames, onProgress, onQrCodeDetected, setFrames])

    return (
        <Camera
            style={styles.camera}
            device={device}
            isActive={true}
            frameProcessor={frameProcessor}
            frameProcessorFps={5}
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
