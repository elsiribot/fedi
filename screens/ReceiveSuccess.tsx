import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { Text, Theme, useTheme } from '@rneui/themed'

import type { RootStackParamList } from '../Router'
import amountUtils from '../utils/AmountUtils'
import Success from '../components/ui/Success'

export type Props = NativeStackScreenProps<RootStackParamList, 'ReceiveSuccess'>

const ReceiveSuccess: React.FC<Props> = ({ route }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { tx } = route.params

    return (
        <Success
            message={
                <View style={styles(theme).textContainer}>
                    <Text h3>
                        {t(
                            tx.type === 'bitcoin'
                                ? 'feature.receive.pending-transaction'
                                : 'feature.receive.you-received',
                        )}
                    </Text>
                    <Text h3>{`${amountUtils.millisToSats(tx.amount)} ${t(
                        'words.sats',
                    )}`}</Text>
                </View>
            }
            buttonText={t('words.done')}
        />
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        textContainer: {
            marginVertical: theme.spacing.lg,
            width: '80%',
            alignItems: 'center',
        },
        successMessage: {
            textAlign: 'center',
            marginBottom: theme.spacing.lg,
        },
        fileNameText: {
            fontWeight: '400',
        },
    })

export default ReceiveSuccess
