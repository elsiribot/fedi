import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { Images } from '../../../assets/images'

import type { RootStackParamList } from '../../../Router'

export type Props = NativeStackScreenProps<RootStackParamList, 'SendOfflineQr'>

const SendOfflineQr: React.FC<Props> = ({ route }: Props) => {
    const { tokens } = route.params
    const qrCodeSize = Dimensions.get('window').width * 0.8
    return (
        <View style={styles.container}>
            <QRCode value={tokens} size={qrCodeSize} logo={Images.FediQrLogo} />
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
