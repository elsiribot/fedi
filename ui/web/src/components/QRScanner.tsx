import type QrScanner from 'qr-scanner'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { theme } from '@fedi/common/constants/theme'

import { styled } from '../styles'
import { Text } from './Text'

export type ScanResult = QrScanner.ScanResult

interface Props {
    onScan(result: ScanResult): void
}

export const QRScanner: React.FC<Props> = ({ onScan }) => {
    const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null)
    const qrScannerRef = useRef<QrScanner | null>(null)
    const [mediaError, setMediaError] = useState<string>()

    const handleScannerSetup = useCallback(async () => {
        if (!videoEl) return
        try {
            const QrScanner = (await import('qr-scanner')).default
            const qrScanner = new QrScanner(videoEl, onScan, {
                returnDetailedScanResult: true,
                maxScansPerSecond: 5,
                onDecodeError: err => {
                    console.log({ err })
                },
            })
            qrScanner
                .start()
                .catch(err => setMediaError(err.message || err.toString()))
            qrScannerRef.current = qrScanner
        } catch (err: any) {
            setMediaError(err.message || err.toString())
        }
    }, [videoEl, onScan])

    useEffect(() => {
        handleScannerSetup()
        return () => {
            const qrScanner = qrScannerRef.current
            if (qrScanner) {
                console.log('stahp')
                qrScanner.stop()
                qrScannerRef.current = null
            }
        }
    }, [handleScannerSetup])

    return (
        <Container>
            <Video ref={setVideoEl} />
            {mediaError && (
                <Error>
                    <Text variant="small">{mediaError}</Text>
                </Error>
            )}
        </Container>
    )
}

const Container = styled('div', {
    position: 'relative',
    width: '100%',
    aspectRatio: '1 / 1',
    padding: 4,
    holoGradient: '900',
    borderRadius: 20,
})

const Video = styled('video', {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    background: theme.colors.extraLightGrey,
    objectFit: 'cover',
})

const Error = styled('div', {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    color: theme.colors.red,
})
