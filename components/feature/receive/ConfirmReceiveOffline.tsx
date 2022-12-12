import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Input } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, StyleSheet, View } from 'react-native'

import { useBridge } from '../../../contexts/FederationsContext'
import { RootStackParamList } from '../../../Router'
import amountUtils from '../../../utils/AmountUtils'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ConfirmReceiveOffline'
>

const ReceiveLightning: React.FC<Props> = ({ route, navigation }: Props) => {
    const { t } = useTranslation()
    const { receiveEcash } = useBridge()
    const [note, setNote] = useState('')
    const { amount, ecash } = route.params
    const [receiving, setReceiving] = useState(false)

    const onReceive = async () => {
        // Don't call multiple times
        if (!receiving) {
            setReceiving(true)
            try {
                await receiveEcash(ecash)
                navigation.navigate('ReceiveSuccess', {
                    tx: { type: 'ecash', amount },
                })
            } catch (e) {
                // TODO: translate
                Alert.alert('Error', e, [
                    {
                        text: 'OK',
                    },
                ])
                setReceiving(false)
            }
        }
    }

    return (
        <View style={styles.container}>
            <Input
                onChangeText={e => setNote(e)}
                value={note}
                placeholder={t('phrases.add-note')}
                returnKeyType="done"
                containerStyle={styles.textInput}
            />
            <Button
                title={`${t('words.receive')} ${amountUtils.toSats(amount)}`}
                onPress={onReceive}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
    },
    instructions: {
        marginTop: 16,
        marginBottom: 16,
        fontSize: 14,
    },
    textInput: {
        width: '80%',
    },
})

export default ReceiveLightning
