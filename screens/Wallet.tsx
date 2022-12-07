import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { Button, Card, Icon, Text, useTheme } from '@rneui/themed'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native'
import type { Theme } from '@rneui/themed'

import type { RootStackParamList } from '../Router'
import type { HomeTabsParamList } from './Home'
import { BalanceEvent, TFedimintEventEmitter } from '../bridge'
import { useFederationsContext } from '../contexts/FederationsContext'

export type Props = BottomTabScreenProps<
    HomeTabsParamList & RootStackParamList,
    'Wallet'
>

type BalanceProps = {
    value: string
}

const Balance = ({ value }: BalanceProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()

    if (value !== '') {
        return (
            <Text h2 style={styles(theme).balanceText}>{`${value} ${t(
                'words.sats',
            )}`}</Text>
        )
    } else {
        return <ActivityIndicator />
    }
}

const Wallet: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { selectedFederation } = useFederationsContext().state
    const [btcBalance, setBtcBalance] = useState('')

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
            setBtcBalance(String(event.balance))
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
                    <Text h4 style={styles(theme).titleText}>
                        {t('words.bitcoin')}
                    </Text>
                </View>
                <Balance value={btcBalance} />
                <View style={styles(theme).buttonsGroupContainer}>
                    <Button
                        title={t('words.receive')}
                        onPress={() => navigation.navigate('Receive')}
                        size="lg"
                        containerStyle={styles(theme).buttonContainer}
                        titleStyle={styles(theme).buttonTitle}
                        buttonStyle={styles(theme).button}
                    />
                    <Button
                        title={t('words.send')}
                        onPress={() => navigation.navigate('Send')}
                        size="lg"
                        containerStyle={styles(theme).buttonContainer}
                        titleStyle={styles(theme).buttonTitle}
                        buttonStyle={styles(theme).button}
                        disabled={!(Number(btcBalance) > 0)}
                    />
                </View>
            </Card>
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
            borderRadius: 20,
            padding: 8,
            width: '88%',
            height: 327,
        },
        cardWrapper: {
            flex: 1,
            justifyContent: 'space-between',
        },
        titleContainer: {
            textAlign: 'left',
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
        },
        titleText: {
            color: theme.colors.secondary,
            paddingHorizontal: 8,
            flex: 1,
        },
        balanceText: {
            textAlign: 'center',
            color: theme.colors.secondary,
        },
        buttonsGroupContainer: {
            margin: 8,
            flexDirection: 'row',
            justifyContent: 'space-between',
        },
        button: {
            backgroundColor: theme.colors.secondary,
        },
        buttonContainer: {
            margin: 8,
            flex: 1,
        },
        buttonTitle: {
            color: theme.colors.primary,
        },
    })

export default Wallet
