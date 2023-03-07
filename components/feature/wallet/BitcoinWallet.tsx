import { useNavigation } from '@react-navigation/native'
import type { Theme } from '@rneui/themed'
import { Button, Card, Text, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useFederationsContext } from '../../../state/contexts/FederationsContext'
import { NavigationHook } from '../../../types/navigation'
import SvgImage from '../../ui/SvgImage'

import Balance from './Balance'

type Props = {
    offline: boolean
}

const BitcoinWallet: React.FC<Props> = ({ offline }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const { selectedFederation } = useFederationsContext().state

    return (
        <Card
            containerStyle={styles(theme).container}
            wrapperStyle={styles(theme).cardWrapper}>
            <View style={styles(theme).titleContainer}>
                <SvgImage name="Bitcoin" />
                <Text medium style={styles(theme).titleText}>
                    {t('words.bitcoin')}
                </Text>
            </View>
            <Balance balance={selectedFederation!.balance} />
            <View style={styles(theme).buttonsGroupContainer}>
                <Button
                    title={
                        <Text caption medium style={styles(theme).buttonTitle}>
                            {t('words.request')}
                        </Text>
                    }
                    onPress={() =>
                        navigation.navigate(
                            offline ? 'ReceiveOffline' : 'Receive',
                        )
                    }
                    containerStyle={styles(theme).buttonContainer}
                    buttonStyle={styles(theme).button}
                />
                <Button
                    title={
                        <Text caption medium style={styles(theme).buttonTitle}>
                            {t('words.send')}
                        </Text>
                    }
                    onPress={() =>
                        navigation.navigate(
                            offline ? 'SendOfflineAmount' : 'Send',
                        )
                    }
                    containerStyle={styles(theme).buttonContainer}
                    buttonStyle={styles(theme).button}
                    disabled={!(selectedFederation!.balance > 0)}
                />
            </View>
        </Card>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            backgroundColor: theme.colors.orange,
            borderRadius: theme.borders.defaultRadius,
            padding: theme.spacing.sm,
            width: '88%',
            minHeight: theme.sizes.walletCardHeight,
        },
        cardWrapper: {
            flex: 1,
            justifyContent: 'space-between',
        },
        titleContainer: {
            textAlign: 'left',
            flexDirection: 'row',
            alignItems: 'center',
            padding: theme.spacing.md,
        },
        titleText: {
            color: theme.colors.secondary,
            paddingHorizontal: theme.spacing.sm,
            flex: 1,
        },
        buttonsGroupContainer: {
            margin: theme.spacing.sm,
            flexDirection: 'row',
            justifyContent: 'space-between',
        },
        button: {
            backgroundColor: theme.colors.secondary,
        },
        buttonContainer: {
            margin: theme.spacing.sm,
            flex: 1,
        },
        buttonTitle: {
            color: theme.colors.primary,
        },
    })

export default BitcoinWallet
