import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
} from 'react-native'

import { useAmountFormatter } from '@fedi/common/hooks/amount'
import { useGuardianFeesDashboard } from '@fedi/common/hooks/guardianFees'
import { useToast } from '@fedi/common/hooks/toast'
import type { MSats } from '@fedi/common/types'
import type { RpcGuardianRemittanceModuleTotal } from '@fedi/common/types/bindings'
import { formatGuardianFeeModuleLabel } from '@fedi/common/utils/guardianFees'

import { Column, Row } from '../components/ui/Flex'
import { SafeAreaContainer } from '../components/ui/SafeArea'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'GuardianFees'>

const GuardianFees: React.FC<Props> = ({ route, navigation }: Props) => {
    const { federationId } = route.params
    const { t } = useTranslation()
    const toast = useToast()
    const { theme } = useTheme()
    const style = styles(theme)
    const [expandedBucketKeys, setExpandedBucketKeys] = useState<string[]>([])

    const { makeFormattedAmountsFromMSats } = useAmountFormatter({
        federationId,
    })
    const {
        currentBalance,
        dayBuckets,
        isBalanceLoading,
        isWithdrawing,
        withdrawAll,
    } = useGuardianFeesDashboard(federationId)
    const firstBucketKey = dayBuckets[0]?.dayKey

    useEffect(() => {
        setExpandedBucketKeys(firstBucketKey ? [firstBucketKey] : [])
    }, [federationId, firstBucketKey])

    const isWithdrawDisabled =
        isBalanceLoading || currentBalance <= 0 || isWithdrawing

    const handleWithdrawAll = async () => {
        if (isWithdrawDisabled) return

        try {
            await withdrawAll()
            navigation.replace('GuardianFeesSuccess')
        } catch (err) {
            toast.error(t, err)
        }
    }

    const currentBalanceAmounts = makeFormattedAmountsFromMSats(
        currentBalance,
        'end',
        true,
    )
    const toggleBucket = (dayKey: string) => {
        setExpandedBucketKeys(keys =>
            keys.includes(dayKey)
                ? keys.filter(key => key !== dayKey)
                : [...keys, dayKey],
        )
    }

    return (
        <SafeAreaContainer edges="bottom">
            <ScrollView contentContainerStyle={style.scrollContent}>
                <Column gap="lg">
                    <Column gap="sm" style={style.balancePanel}>
                        <Text caption color={theme.colors.darkGrey}>
                            {t('feature.guardian-fees.remittance-balance')}
                        </Text>
                        {isBalanceLoading ? (
                            <ActivityIndicator size="small" />
                        ) : (
                            <>
                                <Text h1>
                                    {currentBalanceAmounts.formattedFiat}
                                </Text>
                                <Text caption color={theme.colors.darkGrey}>
                                    {currentBalanceAmounts.formattedSats}
                                </Text>
                            </>
                        )}
                        <Button
                            title={t(
                                'feature.guardian-fees.transfer-all-to-main-balance',
                            )}
                            onPress={handleWithdrawAll}
                            loading={isWithdrawing}
                            disabled={isWithdrawDisabled}
                            containerStyle={style.balanceAction}
                        />
                    </Column>

                    {dayBuckets.length > 0 && (
                        <Column gap="md">
                            <Text h4>
                                {t('feature.guardian-fees.fee-history')}
                            </Text>
                            {dayBuckets.map(bucket => {
                                const isExpanded = expandedBucketKeys.includes(
                                    bucket.dayKey,
                                )

                                return (
                                    <Column
                                        key={bucket.dayKey}
                                        gap="md"
                                        style={style.bucket}>
                                        <Pressable
                                            onPress={() =>
                                                toggleBucket(bucket.dayKey)
                                            }>
                                            <Row
                                                justify="between"
                                                align="center">
                                                <Row center gap="sm">
                                                    <Text medium>
                                                        {bucket.dayKey}
                                                    </Text>
                                                </Row>
                                                <Text medium>
                                                    {
                                                        makeFormattedAmountsFromMSats(
                                                            bucket.totalAmountRemitted as MSats,
                                                            'end',
                                                        ).formattedSats
                                                    }
                                                </Text>
                                            </Row>
                                        </Pressable>
                                        {isExpanded &&
                                            bucket.moduleTotals.map(module => (
                                                <ModuleTotalRow
                                                    key={`${bucket.dayKey}-${module.module}`}
                                                    moduleTotal={module}
                                                    makeFormattedAmountsFromMSats={
                                                        makeFormattedAmountsFromMSats
                                                    }
                                                />
                                            ))}
                                    </Column>
                                )
                            })}
                        </Column>
                    )}
                </Column>
            </ScrollView>
        </SafeAreaContainer>
    )
}

const ModuleTotalRow = ({
    moduleTotal,
    makeFormattedAmountsFromMSats,
}: {
    moduleTotal: RpcGuardianRemittanceModuleTotal
    makeFormattedAmountsFromMSats: ReturnType<
        typeof useAmountFormatter
    >['makeFormattedAmountsFromMSats']
}) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const style = styles(theme)

    return (
        <Row justify="between" align="center" style={style.moduleRow}>
            <Text caption color={theme.colors.darkGrey}>
                {formatGuardianFeeModuleLabel(moduleTotal.module, t)}
            </Text>
            <Text caption>
                {
                    makeFormattedAmountsFromMSats(
                        moduleTotal.totalAmount as MSats,
                        'end',
                    ).formattedSats
                }
            </Text>
        </Row>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        scrollContent: {
            padding: theme.spacing.xl,
        },
        balancePanel: {
            backgroundColor: theme.colors.offWhite100,
            borderRadius: theme.borders.defaultRadius,
            padding: theme.spacing.lg,
        },
        balanceAction: {
            marginTop: theme.spacing.sm,
        },
        bucket: {
            borderColor: theme.colors.extraLightGrey,
            borderRadius: theme.borders.defaultRadius,
            borderWidth: 1,
            padding: theme.spacing.lg,
        },
        moduleRow: {
            borderTopColor: theme.colors.extraLightGrey,
            borderTopWidth: 1,
            paddingTop: theme.spacing.sm,
        },
    })

export default GuardianFees
