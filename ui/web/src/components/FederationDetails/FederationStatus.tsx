import { useTranslation } from 'react-i18next'

import offlineIcon from '@fedi/common/assets/svgs/alert-warning-triangle.svg'
import unstableIcon from '@fedi/common/assets/svgs/info.svg'
import onlineIcon from '@fedi/common/assets/svgs/online-dot.svg'
import { theme } from '@fedi/common/constants/theme'
import { selectIsInternetUnreachable } from '@fedi/common/redux'
import { LoadedFederation } from '@fedi/common/types'

import { useAppSelector } from '../../hooks'
import { styled } from '../../styles'
import { Icon } from '../Icon'
import { Text } from '../Text'

export function FederationStatus({
    federation,
}: {
    federation: LoadedFederation
}) {
    const { t } = useTranslation()

    const status = federation.status || 'offline'
    const caption = t(`feature.federations.connection-status-${status}`)
    const isOffline = useAppSelector(selectIsInternetUnreachable)

    let statusIcon = offlineIcon
    let statusText = t('words.offline')
    let statusColor = theme.colors.red

    if (status === 'online') {
        statusIcon = onlineIcon
        statusText = t('words.online')
        statusColor = theme.colors.success
    } else if (status === 'unstable') {
        statusIcon = unstableIcon
        statusText = t('words.unstable')
    }

    return (
        <FederationStatusCard>
            <FederationStatusHeader>
                <Text variant="caption" css={{ flexGrow: 1 }}>
                    {isOffline
                        ? t('feature.federations.last-known-status')
                        : `${t('words.status')}:`}
                </Text>
                <FederationStatusIndicator>
                    <Icon icon={statusIcon} color={statusColor} size={12} />
                    <Text variant="caption">{statusText}</Text>
                </FederationStatusIndicator>
            </FederationStatusHeader>
            <FederationStatusDivider />
            <Text variant="caption">
                {isOffline
                    ? t('feature.federations.please-reconnect')
                    : caption}
            </Text>
        </FederationStatusCard>
    )
}

const FederationStatusDivider = styled('div', {
    backgroundColor: theme.colors.lightGrey,
    height: 1,
    width: '100%',
})

const FederationStatusCard = styled('div', {
    backgroundColor: theme.colors.offWhite100,
    borderRadius: 20,
    padding: theme.spacing.md,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
})

const FederationStatusHeader = styled('div', {
    display: 'flex',
    alignItems: 'center',
})

const FederationStatusIndicator = styled('div', {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    backgroundColor: theme.colors.white,
    borderRadius: 8,
    padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
    gap: theme.spacing.xs,
})
