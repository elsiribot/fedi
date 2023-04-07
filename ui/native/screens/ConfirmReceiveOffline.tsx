import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Input, Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import type { Transaction } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'

import UsdAmount from '../components/feature/wallet/UsdAmount'
import SvgImage from '../components/ui/SvgImage'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useBridge } from '../state/hooks'
import { RootStackParamList } from '../types/navigation'

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
    const { toast } = useEnvironmentContext().state
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
                    // TODO: Fill out other fields? Missing some required Transaction fields.
                    tx: {
                        offline: { claimed: true },
                        amount,
                    } as Transaction,
                })
            } catch (e: any) {
                toast?.show(e.message, 3000)
                setReceiving(false)
            }
        }
    }

    const amountSats = amountUtils.msatToSat(amount)

    return (
        <View style={styles(theme).container}>
            <View style={styles(theme).offlineContainer}>
                <SvgImage name="Offline" />
                <Text caption>{t('phrases.you-are-offline')}</Text>
            </View>
            <View style={styles(theme).amountContainer}>
                <Text h2>{`${amountUtils.formatNumber(amountSats)} `}</Text>
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
                    title={`${t('words.receive')} ${amountUtils.formatNumber(
                        amountUtils.msatToSat(amount),
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
