import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Image, Input, Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, StyleSheet, View } from 'react-native'

import { Images } from '../assets/images'
import { Transaction } from '../bridge'
import UsdAmount from '../components/feature/wallet/UsdAmount'
import { useBridge } from '../state/hooks'
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
    const { amount, ecash } = route.params
    const [note, setNote] = useState('')
    const [receiving, setReceiving] = useState(false)

    const onReceive = async () => {
        // Don't call multiple times
        if (!receiving) {
            setReceiving(true)
            try {
                await receiveEcash(ecash)
                setReceiving(false)
                navigation.navigate('ReceiveSuccess', {
                    tx: new Transaction({
                        offline: { claimed: true },
                        amount,
                    }),
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

    const amountSats = amountUtils.msatToSat(amount)

    return (
        <View style={styles(theme).container}>
            <View style={styles(theme).offlineContainer}>
                <Image
                    source={Images.Offline}
                    style={styles(theme).offlineIcon}
                />
                <Text caption>{t('phrases.you-are-offline')}</Text>
            </View>
            <View style={styles(theme).amountContainer}>
                <Text h2>{`${amountSats} `}</Text>
                <Text>{`${t('words.sats').toUpperCase()}`}</Text>
            </View>

            <UsdAmount amountSats={amountSats} />
            <Input
                onChangeText={e => setNote(e)}
                value={note}
                placeholder={t('phrases.add-note')}
                returnKeyType="done"
                containerStyle={styles(theme).textInput}
            />
            <View style={styles(theme).actionContainer}>
                <Text caption style={styles(theme).offlineSpendNotice}>
                    {`${t('feature.receive.balance-not-spendable-offline')}`}
                </Text>
                <Button
                    fullWidth
                    title={`${t('words.receive')} ${amountUtils.msatToSat(
                        amount,
                    )} ${t('words.sats').toUpperCase()}`}
                    onPress={onReceive}
                    loading={receiving}
                    containerStyle={styles(theme).buttonContainer}
                />
            </View>
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: theme.spacing.xl,
        },
        actionContainer: {
            marginTop: 'auto',
            width: '100%',
        },
        amountContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: theme.spacing.xxl,
        },
        buttonContainer: {
            marginTop: 'auto',
        },
        offlineSpendNotice: {
            marginVertical: theme.spacing.xl,
            paddingHorizontal: theme.spacing.xl,
            textAlign: 'center',
        },
        offlineContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: theme.spacing.xl,
        },
        offlineIcon: {
            height: theme.sizes.sm,
            width: theme.sizes.sm,
            marginRight: theme.spacing.md,
        },
        textInput: {
            width: '80%',
        },
    })

export default ConfirmReceiveOffline
