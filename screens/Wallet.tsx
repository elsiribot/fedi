import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { Button, Card, Icon, Text, useTheme } from '@rneui/themed'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native'
import type { Theme } from '@rneui/themed'

import type { HomeTabsParamList, RootStackParamList } from '../types/navigation'
import { BalanceEvent, TFedimintEventEmitter } from '../bridge'
import { useFederationsContext } from '../contexts/FederationsContext'
import amountUtils from '../utils/AmountUtils'
import SocialRecoveryProcessing from '../components/feature/recovery/SocialRecoveryProcessing'

export type Props =
    | BottomTabScreenProps<HomeTabsParamList & RootStackParamList, 'Wallet'> & {
          offline: boolean
      }

type BalanceProps = {
    balance: number | null
}

const Balance = ({ balance }: BalanceProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()

    if (balance !== null) {
        return (
            <Text
                h2
                style={styles(theme).balanceText}>{`${amountUtils.millisToSats(
                balance,
            )} ${t('words.sats')}`}</Text>
        )
    } else {
        return <ActivityIndicator />
    }
}

const Wallet: React.FC<Props> = ({ navigation, offline }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { selectedFederation } = useFederationsContext().state
    const [balance, setBalance] = useState<number | null>(null)
    // TODO: Hoist state and listen to bridge for updates
    const [recoveryInProgress] = useState(false)

    // The balanceHandler should change whenever the selectedFederation changes
    const balanceHandler = useCallback(
        (event: BalanceEvent) => {
            // Ignore all events not from the selectedFederation
            if (selectedFederation!.name !== event.federationId) {
                return
            }
            console.log(
                'OS:',
                Platform.OS,
                `| federation -> "${event.federationId}"`,
                `| Wallet: balance -> "${event.balance}"`,
            )
            setBalance(event.balance)
        },
        [selectedFederation],
    )

    // As the balanceHandler changes when switching federations, we make sure
    // to clean up the event listener for balance updates
    // TODO: Consider not using a new TFedimintEventEmitter each time?
    useEffect(() => {
        const emitter = new TFedimintEventEmitter()
        emitter.onBalanceUpdate(balanceHandler)

        return () => {
            emitter.removeListener('balance')
        }
    }, [balanceHandler])

    return (
        <View style={styles(theme).container}>
            {recoveryInProgress ? (
                <SocialRecoveryProcessing />
            ) : (
                <Card
                    containerStyle={styles(theme).cardContainer}
                    wrapperStyle={styles(theme).cardWrapper}>
                    <View style={styles(theme).titleContainer}>
                        <Icon
                            name="bitcoin"
                            type="material-community"
                            color={theme.colors.secondary}
                            size={theme.sizes.sm}
                        />
                        <Text medium style={styles(theme).titleText}>
                            {t('words.bitcoin')}
                        </Text>
                    </View>
                    <Balance balance={balance} />
                    <View style={styles(theme).buttonsGroupContainer}>
                        <Button
                            title={t('words.receive')}
                            onPress={() =>
                                navigation.navigate(
                                    offline ? 'ReceiveOffline' : 'Receive',
                                )
                            }
                            size="lg"
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
                            size="lg"
                            containerStyle={styles(theme).buttonContainer}
                            titleStyle={styles(theme).buttonTitle}
                            buttonStyle={styles(theme).button}
                            disabled={!(Number(balance) > 0)}
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

export default Wallet
