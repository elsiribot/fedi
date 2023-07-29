import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import type { Theme } from '@rneui/themed'
import { useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { ScrollView, StyleSheet } from 'react-native'

import { ErrorBoundary } from '@fedi/common/components/ErrorBoundary'

import ShortcutsList from '../components/feature/home/ShortcutsList'
import SocialRecoveryProcessing from '../components/feature/recovery/SocialRecoveryProcessing'
import BitcoinWallet from '../components/feature/wallet/BitcoinWallet'
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

    return (
        <ScrollView
            contentContainerStyle={styles(theme).container}
            alwaysBounceVertical={false}>
            {recoveryInProgress ? (
                <SocialRecoveryProcessing />
            ) : (
                <>
                    <BitcoinWallet offline={offline} />
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
        },
        cardContainer: {
            backgroundColor: theme.colors.orange,
            borderRadius: theme.borders.defaultRadius,
            padding: theme.spacing.sm,
            width: '88%',
            minHeight: theme.sizes.walletCardHeight,
        },
        cardWrapper: {
            flex: 1,
            justifyContent: 'space-between',
        },
        titleContainer: {
            textAlign: 'left',
            flexDirection: 'row',
            alignItems: 'center',
            padding: theme.spacing.md,
        },
        titleText: {
            color: theme.colors.secondary,
            paddingHorizontal: theme.spacing.sm,
            flex: 1,
        },
        balanceText: {
            textAlign: 'center',
            color: theme.colors.secondary,
            marginBottom: theme.spacing.xs,
        },
        buttonsGroupContainer: {
            margin: theme.spacing.sm,
            flexDirection: 'row',
            justifyContent: 'space-between',
        },
        button: {
            backgroundColor: theme.colors.secondary,
        },
        buttonContainer: {
            margin: theme.spacing.sm,
            flex: 1,
        },
        buttonTitle: {
            color: theme.colors.primary,
        },
    })

export default Home
