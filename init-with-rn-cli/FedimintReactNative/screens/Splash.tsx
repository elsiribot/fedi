import React from 'react'
import { useTranslation } from 'react-i18next'
import { View, Text, Button } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../App'

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

    return (
        <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text>{`Splash`}</Text>
            <Button
                title="Connect to Federation"
                onPress={connectToFederation}
            />
        </View>
    )
}

export default Splash
