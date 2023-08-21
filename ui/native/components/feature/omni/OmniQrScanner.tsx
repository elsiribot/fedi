import { Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { View, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import QrCodeScanner from '../scan/QrCodeScanner'
import { OmniActions } from './OmniActions'
import { OmniInputAction } from './OmniInput'

interface Props {
    onInput(data: string): void
    actions: OmniInputAction[]
    isProcessing: boolean
}

export const OmniQrScanner: React.FC<Props> = ({
    onInput,
    actions,
    isProcessing,
}) => {
    const { theme } = useTheme()
    const style = styles(theme)

    return (
        <SafeAreaView
            edges={['bottom', 'left', 'right']}
            style={style.container}>
            <View style={style.scanner}>
                <QrCodeScanner
                    processing={isProcessing}
                    onQrCodeDetected={onInput}
                />
            </View>
            <OmniActions actions={actions} />
        </SafeAreaView>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            flexDirection: 'column',
            gap: theme.spacing.lg,
            padding: theme.spacing.lg,
            paddingBottom: 0,
        },
        scanner: {
            flex: 1,
            width: '100%',
            borderRadius: 20,
            overflow: 'hidden',
        },
        memberSearch: {
            width: '100%',
        },
        actions: {
            width: '100%',
            flexDirection: 'column',
        },
        action: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: theme.spacing.md,
            gap: theme.spacing.lg,
        },
    })
