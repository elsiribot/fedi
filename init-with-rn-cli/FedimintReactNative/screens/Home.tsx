import React from 'react'
import { useTranslation } from 'react-i18next'
import { View, Text, Button, StyleSheet } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../App'

export type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

const Home: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()

    return (
        <View style={styles.container}>
            <Text>{t('words.home')}</Text>
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
