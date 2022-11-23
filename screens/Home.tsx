import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    View,
    Text,
    Button,
    NativeModules,
    StyleSheet,
    ActivityIndicator,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../Router'

const {
    FedimintFfi: { balance },
} = NativeModules

export type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

type BalanceProps = {
    value: string
}

const Balance = ({ value }: BalanceProps) => {
    const { t } = useTranslation()

    if (value !== '') {
        return (
            <Text style={styles.balanceText}>
                {`${value} ${t('words.sats')}`}
            </Text>
        )
    } else {
        return <ActivityIndicator />
    }
}

const Home: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const [btcBalance, setBtcBalance] = useState('')

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
                />
                <Button
                    title={t('words.send')}
                    onPress={() => navigation.navigate('Send')}
                />
            </View>
            <View style={styles.buttonsContainer}>
                <Button
                    title={t('words.backup')}
                    onPress={() => navigation.navigate('Backup')}
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
    balanceText: {
        fontSize: 36,
        margin: 20,
    },
    buttonsContainer: {
        margin: 10,
        width: '90%',
        flexDirection: 'row',
        justifyContent: 'space-evenly',
    },
})

export default Home
