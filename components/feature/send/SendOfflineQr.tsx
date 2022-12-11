import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { Images } from '../../../assets/images'

import type { RootStackParamList } from '../../../Router'

export type Props = NativeStackScreenProps<RootStackParamList, 'SendOfflineQr'>

const SendOfflineQr: React.FC<Props> = ({ route }: Props) => {
    const { ecash } = route.params
    const qrCodeSize = Dimensions.get('window').width * 0.8
    const [index, setIndex] = useState(0)
    const navigation = useNavigation()
    const onDone = async () => {
        navigation.navigate('Home')
    }

    // show new qr every second
    useEffect(() => {
        const interval = setInterval(() => {
            console.log('setting index')
            setIndex((index + 1) % ecash.length)
        }, 100)
        return () => clearInterval(interval)
    }, [index, ecash])

    return (
        <View style={styles.container}>
            <QRCode
                value={ecash[index]}
                size={qrCodeSize}
                logo={Images.FediQrLogo}
            />
            <Button title={'done'} onPress={onDone} />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
})

export default SendOfflineQr
