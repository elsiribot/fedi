import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import type { Theme } from '@rneui/themed'
import { Button, Card, Text, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import SocialRecoveryProcessing from '../components/feature/recovery/SocialRecoveryProcessing'
import SvgImage from '../components/ui/SvgImage'
import { useFederationsContext } from '../state/contexts/FederationsContext'
import { useBtcUsdPrice } from '../state/hooks'
import { MSats } from '../types'
import type {
    RootStackParamList,
    TabsNavigatorParamList,
} from '../types/navigation'
import amountUtils from '../utils/AmountUtils'

export type Props =
    | BottomTabScreenProps<
          TabsNavigatorParamList & RootStackParamList,
          'Home'
      > & {
          offline: boolean
      }

type BalanceProps = {
    balance: MSats | null
}

const Balance = ({ balance }: BalanceProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { convertSatsToUsdString } = useBtcUsdPrice()

    if (balance !== null) {
        const amountInSats = amountUtils.msatToSat(balance)
        return (
            <View>
                <Text h2 medium style={styles(theme).balanceText}>
                    {`$${convertSatsToUsdString(amountInSats)}`}
                </Text>
                <Text caption medium style={styles(theme).balanceText}>
                    {`${amountUtils.formatNumber(amountInSats)} ${t(
                        'words.sats',
                    ).toUpperCase()}`}
                </Text>
            </View>
        )
    } else {
        return <ActivityIndicator />
    }
}

const Home: React.FC<Props> = ({ navigation, offline }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { selectedFederation } = useFederationsContext().state
    // TODO: Hoist state and listen to bridge for updates
    const [recoveryInProgress] = useState(false)

    return (
        <View style={styles(theme).container}>
            {recoveryInProgress ? (
                <SocialRecoveryProcessing />
            ) : (
                <Card
                    containerStyle={styles(theme).cardContainer}
                    wrapperStyle={styles(theme).cardWrapper}>
                    <View style={styles(theme).titleContainer}>
                        <SvgImage name="Bitcoin" />
                        <Text medium style={styles(theme).titleText}>
                            {t('words.bitcoin')}
                        </Text>
                    </View>
                    <Balance balance={selectedFederation!.balance} />
                    <View style={styles(theme).buttonsGroupContainer}>
                        <Button
                            title={t('words.request')}
                            onPress={() =>
                                navigation.navigate(
                                    offline ? 'ReceiveOffline' : 'Receive',
                                )
                            }
                            containerStyle={styles(theme).buttonContainer}
                            titleStyle={styles(theme).buttonTitle}
                            buttonStyle={styles(theme).button}
                        />
                        <Button
                            title={t('words.send')}
                            onPress={() =>
                                navigation.navigate(
                                    offline ? 'SendOfflineAmount' : 'Send',
                                )
                            }
                            containerStyle={styles(theme).buttonContainer}
                            titleStyle={styles(theme).buttonTitle}
                            buttonStyle={styles(theme).button}
                            disabled={!(selectedFederation!.balance > 0)}
                        />
                    </View>
                </Card>
            )}
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
        cardContainer: {
            backgroundColor: theme.colors.orange,
            borderRadius: theme.borders.defaultRadius,
            padding: theme.spacing.sm,
            width: '88%',
            height: theme.sizes.expandedWalletCardHeight,
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
            marginBottom: theme.spacing.sm,
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
