import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAmountFormatter } from '@fedi/common/hooks/amount'
import { useGuardianFeesDashboard } from '@fedi/common/hooks/guardianFees'
import { useToast } from '@fedi/common/hooks/toast'
import type { MSats } from '@fedi/common/types'
import type { RpcGuardianRemittanceModuleTotal } from '@fedi/common/types/bindings'
import { formatGuardianFeeModuleLabel } from '@fedi/common/utils/guardianFees'

import { Button } from '../../components/Button'
import { ContentBlock } from '../../components/ContentBlock'
import * as Layout from '../../components/Layout'
import { Text } from '../../components/Text'
import { guardianFeesSuccessRoute } from '../../constants/routes'
import { styled, theme } from '../../styles'

const GuardianFeesPage: React.FC = () => {
    const { t } = useTranslation()
    const router = useRouter()
    const toast = useToast()
    const federationId =
        typeof router.query.id === 'string' ? router.query.id : ''
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
    } = useGuardianFeesDashboard(
        router.isReady && federationId ? federationId : undefined,
    )
    const firstBucketKey = dayBuckets[0]?.dayKey

    useEffect(() => {
        setExpandedBucketKeys(firstBucketKey ? [firstBucketKey] : [])
    }, [federationId, firstBucketKey])

    if (!router.isReady) return null

    const isWithdrawDisabled =
        isBalanceLoading || currentBalance <= 0 || isWithdrawing

    const handleWithdrawAll = async () => {
        if (isWithdrawDisabled) return

        try {
            await withdrawAll()
            await router.replace(guardianFeesSuccessRoute)
        } catch (err) {
            toast.error(t, err, 'errors.unknown-error')
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
        <ContentBlock>
            <Layout.Root>
                <Layout.Header back>
                    <Layout.Title subheader>
                        {t('feature.settings.guardian-fees')}
                    </Layout.Title>
                </Layout.Header>

                <Layout.Content fullWidth>
                    <Content>
                        <BalancePanel>
                            <Text variant="caption">
                                {t('feature.guardian-fees.remittance-balance')}
                            </Text>
                            {isBalanceLoading ? (
                                <Text variant="h1">{t('words.loading')}</Text>
                            ) : (
                                <>
                                    <Text variant="h1">
                                        {currentBalanceAmounts.formattedFiat}
                                    </Text>
                                    <Text variant="caption">
                                        {currentBalanceAmounts.formattedSats}
                                    </Text>
                                </>
                            )}
                            <Actions>
                                <Button
                                    width="full"
                                    onClick={handleWithdrawAll}
                                    loading={isWithdrawing}
                                    disabled={isWithdrawDisabled}>
                                    {t(
                                        'feature.guardian-fees.transfer-all-to-main-balance',
                                    )}
                                </Button>
                            </Actions>
                        </BalancePanel>

                        {dayBuckets.length > 0 && (
                            <History>
                                <Text variant="h2">
                                    {t('feature.guardian-fees.fee-history')}
                                </Text>
                                {dayBuckets.map(bucket => {
                                    const isExpanded =
                                        expandedBucketKeys.includes(
                                            bucket.dayKey,
                                        )

                                    return (
                                        <Bucket key={bucket.dayKey}>
                                            <BucketHeader
                                                type="button"
                                                onClick={() =>
                                                    toggleBucket(bucket.dayKey)
                                                }>
                                                <BucketTitle>
                                                    <Text weight="medium">
                                                        {bucket.dayKey}
                                                    </Text>
                                                </BucketTitle>
                                                <Text weight="medium">
                                                    {
                                                        makeFormattedAmountsFromMSats(
                                                            bucket.totalAmountRemitted as MSats,
                                                            'end',
                                                        ).formattedSats
                                                    }
                                                </Text>
                                            </BucketHeader>
                                            {isExpanded &&
                                                bucket.moduleTotals.map(
                                                    module => (
                                                        <ModuleTotalRow
                                                            key={`${bucket.dayKey}-${module.module}`}
                                                            moduleTotal={module}
                                                            makeFormattedAmountsFromMSats={
                                                                makeFormattedAmountsFromMSats
                                                            }
                                                        />
                                                    ),
                                                )}
                                        </Bucket>
                                    )
                                })}
                            </History>
                        )}
                    </Content>
                </Layout.Content>
            </Layout.Root>
        </ContentBlock>
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

    return (
        <ModuleRow>
            <Text variant="caption">
                {formatGuardianFeeModuleLabel(moduleTotal.module, t)}
            </Text>
            <Text variant="caption">
                {
                    makeFormattedAmountsFromMSats(
                        moduleTotal.totalAmount as MSats,
                        'end',
                    ).formattedSats
                }
            </Text>
        </ModuleRow>
    )
}

const Content = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    width: '100%',
})

const BalancePanel = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: 16,
    background: theme.colors.offWhite,
    borderRadius: 8,
})

const Actions = styled('div', {
    display: 'grid',
    gap: 8,
    gridTemplateColumns: '1fr',
    marginTop: 4,
})

const History = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
})

const Bucket = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: 16,
    border: `1px solid ${theme.colors.lightGrey}`,
    borderRadius: 8,
})

const BucketHeader = styled('button', {
    alignItems: 'center',
    background: 'transparent',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    display: 'flex',
    gap: 12,
    justifyContent: 'space-between',
    padding: 0,
    textAlign: 'left',
    width: '100%',
})

const BucketTitle = styled('div', {
    alignItems: 'center',
    display: 'flex',
    gap: 8,
})

const ModuleRow = styled('div', {
    alignItems: 'center',
    borderTop: `1px solid ${theme.colors.lightGrey}`,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 8,
})

export default GuardianFeesPage
