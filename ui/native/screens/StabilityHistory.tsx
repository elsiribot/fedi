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
    const [isLoading, setIsLoading] = useState(true)
    const transactionsList = useAppSelector(selectStabilityTransactionHistory)
    const dispatch = useAppDispatch()

    const refreshStabilityPoolHistory = useCallback(async () => {
        await dispatch(refreshActiveStabilityPool({ fedimint }))
    }, [dispatch])

    useEffect(() => {
        refreshStabilityPoolHistory().finally(() => setIsLoading(false))
    }, [dispatch, refreshStabilityPoolHistory])

    return (
        <View style={styles.container}>
            <StabilityTransactionsList
                transactions={transactionsList}
                loading={isLoading}
                refreshTransactions={refreshStabilityPoolHistory}
            />
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
