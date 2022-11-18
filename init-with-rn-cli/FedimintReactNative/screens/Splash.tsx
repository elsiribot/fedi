import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button, NativeModules, StyleSheet, Text, View } from 'react-native'
import Icon from 'react-native-vector-icons/FontAwesome'

import type { RootStackParamList } from '../App'

const { FedimintFfi } = NativeModules
const { init } = FedimintFfi

export type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>

const Splash: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()

    const connectToFederation = () => {
        console.log('connecting to federation')
        // TODO: call FedimintFfi.init here after getting the connection
        // string from a QR Code / Paste String UI (hardcoded in rust for now...)
        // then navigate to home screen on success

        navigation.navigate('Home')
    }

    const testModuleFunction = async () => {
        // console.log('2 * 10', await multiply(2, 10))
    }

    return (
        <View style={styles.container}>
            <Button
                title={t('phrases.connect-to-federation')}
                onPress={connectToFederation}
            />
            <Button title="Test module function" onPress={testModuleFunction} />
            <Icon name="bitcoin" size={30} color="orange" />
        </View>
    )
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-evenly',
    },
})

export default Splash
