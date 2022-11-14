import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View, Text, Button, NativeModules, StyleSheet } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../App'

const {
    FedimintFfi: { balance },
} = NativeModules

export type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

const Home: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const [btcBalance, setBtcBalance] = useState()

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
            <Text>{t('words.home')}</Text>
            <Text>{`${btcBalance} ${t('words.sats')}`}</Text>
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
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonsContainer: {
        width: '90%',
        flexDirection: 'row',
        justifyContent: 'space-evenly',
    },
})

export default Home
