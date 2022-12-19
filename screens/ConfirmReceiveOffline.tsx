import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Input, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, StyleSheet, View } from 'react-native'

import { useBridge } from '../contexts/FederationsContext'
import { RootStackParamList } from '../types/navigation'
import amountUtils from '../utils/AmountUtils'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ConfirmReceiveOffline'
>

const ConfirmReceiveOffline: React.FC<Props> = ({
    route,
    navigation,
}: Props) => {
    const { theme } = useTheme()
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
            } catch (e: any) {
                // FIXME: how can we type our error messages better?
                Alert.alert(t('words.error'), e.message, [
                    {
                        text: t('words.done'),
                    },
                ])
                setReceiving(false)
            }
        }
    }

    return (
        <View style={styles(theme).container}>
            <Input
                onChangeText={e => setNote(e)}
                value={note}
                placeholder={t('phrases.add-note')}
                returnKeyType="done"
                containerStyle={styles(theme).textInput}
            />
            <Button
                title={`${t('words.receive')} ${amountUtils.millisToSats(
                    amount,
                )}`}
                onPress={onReceive}
            />
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            width: '100%',
            alignItems: 'center',
        },
        instructions: {
            marginVertical: theme.spacing.md,
            fontSize: theme.sizes.xxs,
        },
        textInput: {
            width: '80%',
        },
    })

export default ConfirmReceiveOffline
