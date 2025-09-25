import { Divider, Text, Theme, useTheme } from '@rneui/themed'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'

import { usePopupFederationInfo } from '@fedi/common/hooks/federation'
import { selectIsInternetUnreachable } from '@fedi/common/redux'

import { useAppSelector } from '../../../state/hooks'
import { LoadedFederation } from '../../../types'
import { Column, Row } from '../../ui/Flex'
import SvgImage, { SvgImageName } from '../../ui/SvgImage'

const FederationStatus = ({ federation }: { federation: LoadedFederation }) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const style = styles(theme)

    const status = federation.status || 'offline'
    const caption = t(`feature.federations.connection-status-${status}`)
    const isOffline = useAppSelector(selectIsInternetUnreachable)

    const popupInfo = usePopupFederationInfo(federation?.meta ?? {})

    let statusIcon: SvgImageName = 'AlertWarningTriangle'
    let statusText = t('words.offline')
    let statusColor = theme.colors.red

    if (status === 'online') {
        statusIcon = 'Online'
        statusText = t('words.online')
        statusColor = theme.colors.success
    } else if (status === 'unstable') {
        statusIcon = 'Info'
        statusText = t('words.unstable')
    }

    if (popupInfo?.ended) {
        statusIcon = 'Online'
        statusText = t('words.expired')
        statusColor = theme.colors.grey
    }

    return (
        <Column gap="sm" style={style.federationStatusCard}>
            <Row align="center" justify="between">
                <Column shrink>
                    <Text caption maxFontSizeMultiplier={1.2}>
                        {isOffline
                            ? t('feature.federations.last-known-status')
                            : t('words.status')}
                    </Text>
                </Column>
                <Row center shrink={false} style={style.statusBadge}>
                    <SvgImage size={16} name={statusIcon} color={statusColor} />
                    <Text
                        medium
                        caption
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        maxFontSizeMultiplier={1.4}>
                        {statusText}
                    </Text>
                </Row>
            </Row>
            <Divider />
            <Text caption>
                {isOffline
                    ? t('feature.federations.please-reconnect')
                    : caption}
            </Text>
        </Column>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        federationStatusCard: {
            backgroundColor: theme.colors.grey50,
            borderRadius: 20,
            padding: theme.spacing.lg,
        },
        statusBadge: {
            borderRadius: 8,
            backgroundColor: theme.colors.white,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.xs,
            gap: theme.spacing.xs,
        },
    })

export default FederationStatus
