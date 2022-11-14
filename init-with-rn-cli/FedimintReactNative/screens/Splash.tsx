import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button, NativeModules, Text, View } from 'react-native'

import type { RootStackParamList } from '../App'

const { FedimintFfi } = NativeModules
const { multiply, init } = FedimintFfi

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
