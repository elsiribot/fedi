import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TextInput, View } from 'react-native'
import SendConfirmationModal from '../components/feature/send/SendConfirmationModal'
import { useBridge } from '../contexts/FederationsContext'

import type { RootStackParamList } from '../types/navigation'
import amountUtils from '../utils/AmountUtils'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ConfirmSendOnChain'
>

const ConfirmSendOnChain: React.FC<Props> = ({ route }: Props) => {
    const { t } = useTranslation()
    const { payAddress } = useBridge()
    const { address } = route.params
    const [amount, setAmount] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [unit] = useState('sats')

    const onSendBtc = async () => {
        try {
            console.log('paying address', address, amount)
            await payAddress(address, amountUtils.stringToSats(amount))
            console.log('paid')
            setShowModal(true)
        } catch (error) {
            console.error(error)
        }
    }

    const onChangeText = (updatedValue: string) => {
        setAmount(updatedValue)
    }

    return (
        <View style={styles.container}>
            <View style={styles.detailsContainer}>
                <Text style={styles.address}>{address}</Text>
                <TextInput
                    onChangeText={onChangeText}
                    value={amount}
                    placeholder={`${t('words.amount')} (${t('words.sats')})`}
                    keyboardType="numeric"
                    returnKeyType="done"
                />
                <View style={styles.buttonContainer}>
                    <Button title={t('words.send')} onPress={onSendBtc} />
                </View>
                <SendConfirmationModal
                    visible={showModal}
                    amount={amountUtils.stringToSats(amount)}
                    unit={unit}
                />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-evenly',
    },
    detailsContainer: {
        height: '50%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonContainer: {
        width: '90%',
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        margin: 10,
    },
    text: {
        fontSize: 30,
        margin: 10,
    },
    address: {
        color: 'white',
    },
})

export default ConfirmSendOnChain
