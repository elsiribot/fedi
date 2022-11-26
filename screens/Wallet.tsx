import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { Button, Text } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    ActivityIndicator,
    NativeModules,
    StyleSheet,
    View,
} from 'react-native'

import { listTransactions } from '../bridge'
import type { RootStackParamList } from '../Router'
import type { HomeTabsParamList } from './Home'

const {
    FedimintFfi: { balance },
} = NativeModules

export type Props = BottomTabScreenProps<
    HomeTabsParamList & RootStackParamList,
    'Wallet'
>

type BalanceProps = {
    value: string
}

const Balance = ({ value }: BalanceProps) => {
    const { t } = useTranslation()

    if (value !== '') {
        return <Text h2>{`${value} ${t('words.sats')}`}</Text>
    } else {
        return <ActivityIndicator />
    }
}

const Wallet: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const [btcBalance, setBtcBalance] = useState('')

    useEffect(() => {
        const testFetchTransactions = async () => {
            const transactions = await listTransactions()
            console.log('transactions', transactions)
        }

        testFetchTransactions()
    }, [])

    useEffect(() => {
        const getBalance = async () => {
            try {
                const result = await balance()
                setBtcBalance(result)
            } catch (error) {
                console.error(error)
            }
        }

        const interval = setInterval(() => {
            getBalance()
        }, 1000)

        return () => clearInterval(interval)
    }, [])

    return (
        <View style={styles.container}>
            <Balance value={btcBalance} />
            <View style={styles.buttonsContainer}>
                <Button
                    title={t('words.receive')}
                    onPress={() => navigation.navigate('Receive')}
                    size="lg"
                    containerStyle={styles.button}
                />
                <Button
                    title={t('words.send')}
                    onPress={() => navigation.navigate('Send')}
                    size="lg"
                    containerStyle={styles.button}
                />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    button: {
        flex: 1,
        marginLeft: 10,
        marginRight: 10,
    },
    buttonsContainer: {
        margin: 20,
        width: '90%',
        flexDirection: 'row',
        justifyContent: 'space-evenly',
    },
})

export default Wallet
