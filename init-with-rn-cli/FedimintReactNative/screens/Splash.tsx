import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button, NativeModules, Text, View } from 'react-native'

import type { RootStackParamList } from '../App'

const { FedimintFfi } = NativeModules
const { multiply, add } = FedimintFfi

export type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>

// const FEDERATION_CONNECTION_STRING = ''

const Splash: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()

    const connectToFederation = () => {
        console.log('connecting to federation')
        // call fedimint-ffi here with FEDERATION_CONNECTION_STRING
        // then navigate to home screen on success

        navigation.navigate('Home')
    }

    const testModuleFunction = async () => {
        // call fedimint-ffi here with FEDERATION_CONNECTION_STRING
        // then navigate to home screen on success

        console.log('2 * 10', await multiply(2, 10))

        const start = Date.now()
        console.log('2 + 10', await add(2, 10))
        const end = Date.now()
        console.log('ffi took', end - start, 'ms')
    }

    return (
        <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text>{'Splash'}</Text>
            <Button
                title="Connect to Federation"
                onPress={connectToFederation}
            />
            <Button title="Test module function" onPress={testModuleFunction} />
        </View>
    )
}

export default Splash
