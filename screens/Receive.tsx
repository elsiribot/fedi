import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { ButtonGroup } from '@rneui/themed'

import type { RootStackParamList } from '../types/navigation'

import ReceiveLightning from '../components/feature/receive/ReceiveLightning'
import ReceiveOnchain from '../components/feature/receive/ReceiveOnchain'

export type Props = NativeStackScreenProps<RootStackParamList, 'Receive'>

const Receive: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const [walletMode, setWalletMode] = useState<string>('lightning')

    const showInvoice = (invoice: string) => {
        navigation.navigate('LnInvoice', {
            invoice,
        })
    }

    return (
        <View style={styles.container}>
            <ButtonGroup
                selectedIndex={walletMode === 'lightning' ? 0 : 1}
                onPress={index => {
                    if (index === 0) setWalletMode('lightning')
                    if (index === 1) setWalletMode('onchain')
                }}
                buttons={[t('words.lightning'), t('words.onchain')]}
                containerStyle={styles.buttonGroupContainer}
            />

            {walletMode === 'lightning' ? (
                <ReceiveLightning handleInvoice={showInvoice} />
            ) : (
                <ReceiveOnchain />
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonGroupContainer: {
        borderRadius: 50,
        marginTop: 16,
        marginBottom: 16,
    },
})

export default Receive
