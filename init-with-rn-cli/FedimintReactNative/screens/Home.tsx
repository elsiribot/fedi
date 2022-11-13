import React from 'react'
import { useTranslation } from 'react-i18next'
import { View, Text, Button } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../App'

export type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

const Home: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()

    return (
        <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text>{`Home`}</Text>
            <Button
                title="Receive"
                onPress={() => navigation.navigate('Receive')}
            />
            <Button title="Send" onPress={() => navigation.navigate('Send')} />
        </View>
    )
}

export default Home
