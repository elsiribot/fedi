import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import type { Theme } from '@rneui/themed'
import { useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { ScrollView, StyleSheet } from 'react-native'

import { ErrorBoundary } from '@fedi/common/components/ErrorBoundary'
import { useIsStabilityPoolSupported } from '@fedi/common/hooks/federation'
import {
    selectFederationBalance,
    selectStableBalanceEnabled,
} from '@fedi/common/redux'

import ShortcutsList from '../components/feature/home/ShortcutsList'
import SocialRecoveryProcessing from '../components/feature/recovery/SocialRecoveryProcessing'
import StabilityWallet from '../components/feature/stabilitypool/StabilityWallet'
import BitcoinWallet from '../components/feature/wallet/BitcoinWallet'
import { useAppSelector } from '../state/hooks'
import type {
    RootStackParamList,
    TabsNavigatorParamList,
} from '../types/navigation'

export type Props =
    | BottomTabScreenProps<
          TabsNavigatorParamList & RootStackParamList,
          'Home'
      > & {
          offline: boolean
      }

const Home: React.FC<Props> = ({ offline }: Props) => {
    const { theme } = useTheme()
    // TODO: Hoist state and listen to bridge for updates
    const [recoveryInProgress] = useState(false)
    const isStabilityPoolSupported = useIsStabilityPoolSupported()
    const balance = useAppSelector(selectFederationBalance)
    const enableStableBalance = useAppSelector(selectStableBalanceEnabled)

    const showStabilityWallet =
        isStabilityPoolSupported && enableStableBalance && balance > 0

    return (
        <ScrollView
            contentContainerStyle={styles(theme).container}
            alwaysBounceVertical={false}>
            {recoveryInProgress ? (
                <SocialRecoveryProcessing />
            ) : (
                <>
                    <BitcoinWallet offline={offline} />
                    {showStabilityWallet && <StabilityWallet />}
                    <ErrorBoundary fallback={null}>
                        <ShortcutsList />
                    </ErrorBoundary>
                </>
            )}
        </ScrollView>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingTop: theme.spacing.sm,
            paddingHorizontal: theme.spacing.lg,
        },
    })

export default Home
