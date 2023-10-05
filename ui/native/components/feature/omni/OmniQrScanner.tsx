import { Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { View, StyleSheet } from 'react-native'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'

import { useHasBottomTabsNavigation } from '../../../utils/hooks'
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
    const insets = useSafeAreaInsets()
    const hasBottomTabs = useHasBottomTabsNavigation()
    const style = styles(
        theme,
        hasBottomTabs ? { ...insets, bottom: 0 } : insets,
    )

    return (
        <View style={style.container}>
            <View style={style.scanner}>
                <QrCodeScanner
                    processing={isProcessing}
                    onQrCodeDetected={onInput}
                />
            </View>
            <OmniActions actions={actions} />
        </View>
    )
}

const styles = (theme: Theme, insets: EdgeInsets) =>
    StyleSheet.create({
        container: {
            flex: 1,
            flexDirection: 'column',
            gap: theme.spacing.lg,
            paddingTop: theme.spacing.lg,
            paddingLeft: theme.spacing.lg + (insets.left || 0),
            paddingRight: theme.spacing.lg + (insets.right || 0),
            paddingBottom: Math.max(theme.spacing.lg, insets.bottom || 0),
        },
        scanner: {
            flex: 1,
            width: '100%',
            borderRadius: 20,
            overflow: 'hidden',
            backgroundColor: theme.colors.extraLightGrey,
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
