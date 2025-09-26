import { Divider, Text, Theme, useTheme } from '@rneui/themed'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet } from 'react-native'

import { GuardianStatus } from '@fedi/common/types/bindings'
import amountUtils from '@fedi/common/utils/AmountUtils'
import {
    getFederationMaxBalanceMsats,
    getFederationMaxInvoiceMsats,
} from '@fedi/common/utils/FederationUtils'
import { formatLargeNumber } from '@fedi/common/utils/format'

import { fedimint } from '../../../bridge'
import { LoadedFederation, MSats } from '../../../types'
import { Column, Row } from '../../ui/Flex'

// If no max invoice or max balance limit is set in federation metadata, falls back to 1B sats (1T MSats)
const fallbackMsats = 1_000_000_000_000 as MSats

function FederationDetailStats({
    federation,
}: {
    federation: LoadedFederation
}) {
    const [guardianStatuses, setGuardianStatuses] =
        useState<Array<GuardianStatus> | null>(null)
    const [isLoadingGuardians, setIsLoadingGuardians] = useState(true)

    const { t } = useTranslation()
    const { theme } = useTheme()

    const totalGuardians = guardianStatuses ? guardianStatuses.length : 0
    const onlineGuardians = guardianStatuses
        ? guardianStatuses.filter(g => 'online' in g).length
        : 0

    const maxBalanceMsats = getFederationMaxBalanceMsats(federation?.meta)
    const maxInvoiceMsats = getFederationMaxInvoiceMsats(federation?.meta)
    const formattedWalletBalance = `${formatLargeNumber(
        amountUtils.msatToSat(maxBalanceMsats ?? fallbackMsats),
        'K',
    )} ${t('words.sats').toUpperCase()}`
    const formattedSpendLimit = `${formatLargeNumber(
        amountUtils.msatToSat(maxInvoiceMsats ?? fallbackMsats),
        'K',
    )} ${t('words.sats').toUpperCase()}`

    useEffect(() => {
        fedimint
            .getGuardianStatus(federation.id)
            .then(setGuardianStatuses)
            .finally(() => setIsLoadingGuardians(false))
    }, [federation.id])

    const style = styles(theme)

    return (
        <Row style={style.container}>
            <Column align="center" grow gap="xs">
                <Text small medium>
                    {t('words.guardians')}
                </Text>
                {isLoadingGuardians ? (
                    <ActivityIndicator />
                ) : (
                    <Text caption medium>
                        {guardianStatuses
                            ? `${onlineGuardians}/${totalGuardians}`
                            : '--/--'}
                    </Text>
                )}
            </Column>
            <Divider orientation="vertical" />
            <Column align="center" grow gap="xs">
                <Text small medium>
                    {t('feature.federations.wallet-balance')}
                </Text>
                <Text caption medium>
                    {formattedWalletBalance}
                </Text>
            </Column>
            <Divider orientation="vertical" />
            <Column align="center" grow gap="xs">
                <Text small medium>
                    {t('feature.federations.spend-limit')}
                </Text>
                <Text caption medium>
                    {formattedSpendLimit}
                </Text>
            </Column>
        </Row>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            padding: theme.spacing.md,
            borderRadius: theme.borders.defaultRadius,
            backgroundColor: theme.colors.grey50,
        },
    })

export default FederationDetailStats
