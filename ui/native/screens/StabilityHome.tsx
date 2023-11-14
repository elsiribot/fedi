import { useNavigation } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme } from '@rneui/themed'
import { useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import * as Progress from 'react-native-progress'

import { useMonitorStabilityPool } from '@fedi/common/hooks/stabilitypool'
import {
    selectStableBalance,
    selectStableBalancePending,
} from '@fedi/common/redux'
import { makePendingBalanceText } from '@fedi/common/utils/wallet'

import { fedimint } from '../bridge'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppSelector, useStabilityPool } from '../state/hooks'
import type { NavigationHook, RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'StabilityHome'>

const StabilityHome: React.FC<Props> = () => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const { toast } = useEnvironmentContext().state
    const navigation = useNavigation<NavigationHook>()
    const stableBalance = useAppSelector(selectStableBalance)
    const stableBalancePending = useAppSelector(selectStableBalancePending)

    const { formattedStableBalance, formattedStableBalancePending } =
        useStabilityPool()

    const style = styles(theme)

    useMonitorStabilityPool(fedimint)

    return (
        <View style={style.container}>
            <View style={style.balanceContainer}>
                <Progress.Circle
                    progress={1}
                    color={
                        stableBalance > 0
                            ? theme.colors.green
                            : theme.colors.primaryVeryLight
                    }
                    thickness={theme.sizes.stabilityPoolCircleThickness}
                    size={theme.sizes.stabilityPoolCircle}
                    borderWidth={1}
                />
                <View style={style.balanceTextContainer}>
                    <Text h1 h1Style={style.balanceText}>
                        {`${formattedStableBalance}`}
                    </Text>
                    {stableBalancePending !== 0 && (
                        <Text small style={style.balancePendingText}>
                            {makePendingBalanceText(
                                t,
                                stableBalancePending,
                                formattedStableBalancePending,
                            )}
                        </Text>
                    )}
                </View>
            </View>
            <View style={style.buttonContainer}>
                <Button
                    containerStyle={[style.button]}
                    onPress={() => {
                        // Block deposits if pending balance is negative because we have to wait until pending withdrawals have processed
                        if (stableBalancePending < 0) {
                            toast?.show(
                                t(
                                    'feature.stabilitypool.pending-withdrawal-blocking-deposit',
                                ),
                                5000,
                            )
                        } else {
                            navigation.navigate('StabilityDeposit')
                        }
                    }}
                    title={
                        <Text medium caption style={style.buttonText}>
                            {t('words.deposit')}
                        </Text>
                    }
                />
                <Button
                    containerStyle={[style.button]}
                    onPress={() => navigation.navigate('StabilityWithdraw')}
                    title={
                        <Text medium caption style={style.buttonText}>
                            {t('words.withdraw')}
                        </Text>
                    }
                    // TODO: implement withdrawals && compare against minimum withdraw amount
                    disabled={stableBalance === 0 && stableBalancePending === 0}
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
            justifyContent: 'center',
            padding: theme.spacing.md,
        },
        balanceContainer: {
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 'auto',
        },
        balanceTextContainer: {
            position: 'absolute',
            flexDirection: 'column',
            alignItems: 'center',
        },
        balanceText: {
            flex: 1,
        },
        balancePendingText: {
            flex: 1,
        },
        buttonContainer: {
            width: '100%',
            flexDirection: 'row',
            marginTop: 'auto',
            gap: 20,
        },
        button: {
            flex: 1,
        },
        buttonText: {
            color: theme.colors.secondary,
        },
    })

export default StabilityHome
