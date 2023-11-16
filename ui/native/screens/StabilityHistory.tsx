import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

import {
    refreshActiveStabilityPool,
    selectStabilityTransactionHistory,
} from '@fedi/common/redux'

import { fedimint } from '../bridge'
import StabilityTransactionsList from '../components/feature/stabilitypool/StabilityTransactionsList'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'StabilityHistory'
>

const StabilityHistory: React.FC<Props> = () => {
    const { t } = useTranslation()
    const [isLoading, setIsLoading] = useState(false)
    const transactionsList = useAppSelector(selectStabilityTransactionHistory)
    const dispatch = useAppDispatch()

    const refreshStabilityPoolHistory = useCallback(async () => {
        dispatch(refreshActiveStabilityPool({ fedimint }))
    }, [dispatch])

    useEffect(() => {
        refreshStabilityPoolHistory()
        setIsLoading(false)
    }, [dispatch, refreshStabilityPoolHistory])

    if (isLoading) return <ActivityIndicator />

    return (
        <View style={styles.container}>
            {transactionsList.length === 0 ? (
                <Text>{t('phrases.no-transactions')}</Text>
            ) : (
                <StabilityTransactionsList
                    transactions={transactionsList}
                    refreshTransactions={refreshStabilityPoolHistory}
                />
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-evenly',
    },
})

export default StabilityHistory
