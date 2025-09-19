import { useRouter } from 'next/router'
import { Trans, useTranslation } from 'react-i18next'

import offlineIcon from '@fedi/common/assets/svgs/alert-warning-triangle.svg'
import clockIcon from '@fedi/common/assets/svgs/clock.svg'
import unstableIcon from '@fedi/common/assets/svgs/info.svg'
import onlineIcon from '@fedi/common/assets/svgs/online-dot.svg'
import { theme } from '@fedi/common/constants/theme'
import { usePopupFederationInfo } from '@fedi/common/hooks/federation'
import {
    selectDefaultChats,
    selectIsInternetUnreachable,
    selectLoadedFederation,
} from '@fedi/common/redux'
import { LoadedFederation, Sats } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'
import {
    getFederationMaxBalanceMsats,
    getFederationMaxInvoiceMsats,
    getFederationTosUrl,
    getFederationWelcomeMessage,
} from '@fedi/common/utils/FederationUtils'

import { Button } from '../../components/Button'
import DefaultRoomPreview from '../../components/Chat/DefaultRoomPreview'
import { ContentBlock } from '../../components/ContentBlock'
import { FederationAvatar } from '../../components/FederationAvatar'
import { Icon } from '../../components/Icon'
import * as Layout from '../../components/Layout'
import { ShadowScroller } from '../../components/ShadowScroller'
import { Text } from '../../components/Text'
import { useAppSelector } from '../../hooks'
import { styled } from '../../styles'

function FederationDetails() {
    const { query, isReady } = useRouter()
    const { t } = useTranslation()

    const id = (query.id as string | undefined) ?? ''
    const federation = useAppSelector(s => selectLoadedFederation(s, id))
    const federationChats = useAppSelector(s => selectDefaultChats(s, id))

    if (!federation || !isReady || !id) return null

    const welcomeMessage = getFederationWelcomeMessage(federation.meta)
    const tosUrl = getFederationTosUrl(federation.meta)
    const maxBalanceMsats = getFederationMaxBalanceMsats(federation?.meta)
    const maxInvoiceMsats = getFederationMaxInvoiceMsats(federation?.meta)

    const walletBalance: Sats = maxBalanceMsats
        ? ((maxBalanceMsats / 1000) as Sats)
        : (1_000_000_000 as Sats)

    const spendLimit: Sats = maxInvoiceMsats
        ? ((maxInvoiceMsats / 1000) as Sats)
        : (1_000_000_000 as Sats)

    return (
        <ContentBlock>
            <Layout.Root>
                <Layout.Header back>
                    <Layout.Title subheader>
                        {t('feature.federations.federation-details')}
                    </Layout.Title>
                </Layout.Header>
                <Layout.Content>
                    <Content>
                        <HeaderContent>
                            <FederationHeader>
                                <FederationAvatar
                                    federation={federation}
                                    size="lg"
                                    css={{ flexShrink: 0 }}
                                />
                                <Text variant="h2">{federation.name}</Text>
                            </FederationHeader>
                            <FederationEndIndicator federation={federation} />
                            <FederationStatus federation={federation} />
                        </HeaderContent>
                        <ScrollableContent>
                            {federationChats.length > 0 && (
                                <ChatsContainer>
                                    <Text variant="h2" weight="bold">
                                        {t('feature.chat.federation-news')}
                                    </Text>
                                    {federationChats.map(room => (
                                        <DefaultRoomPreview
                                            room={room}
                                            federationOrCommunity={federation}
                                            key={`default-chat-${room.id}`}
                                        />
                                    ))}
                                </ChatsContainer>
                            )}
                            {welcomeMessage && <Text>{welcomeMessage}</Text>}
                            <Text>
                                {t('phrases.wallet-balance', {
                                    balance:
                                        amountUtils.formatSats(walletBalance),
                                })}
                            </Text>
                            <Text>
                                {t('phrases.spend-limit', {
                                    limit: amountUtils.formatSats(spendLimit),
                                })}
                            </Text>
                        </ScrollableContent>
                    </Content>
                    {tosUrl && (
                        <Actions>
                            <Button
                                variant="secondary"
                                as="a"
                                href={tosUrl}
                                target="_blank">
                                {t(
                                    'feature.federations.federation-terms-and-conditions',
                                )}
                            </Button>
                        </Actions>
                    )}
                </Layout.Content>
            </Layout.Root>
        </ContentBlock>
    )
}

function FederationEndIndicator({
    federation,
}: {
    federation: LoadedFederation
}) {
    const { t } = useTranslation()
    const popupInfo = usePopupFederationInfo(federation?.meta || {})

    if (!popupInfo) return null

    if (popupInfo.ended) {
        return (
            <FederationEndCard variant="ended">
                <Text variant="caption">
                    {popupInfo.endedMessage || (
                        <Trans
                            t={t}
                            i18nKey="feature.popup.ended-description"
                            values={{ date: popupInfo?.endsAtText }}
                            components={{
                                bold: (
                                    // @ts-expect-error - although usually infertile, `Trans` manages to obtain `children` to insert into the `Text` component
                                    <Text
                                        variant="caption"
                                        weight="bold"
                                        css={{ display: 'inline' }}
                                    />
                                ),
                            }}
                        />
                    )}
                </Text>
            </FederationEndCard>
        )
    }

    return (
        <FederationEndCard>
            <FederationEndingLabel>
                <Icon icon={clockIcon} size={16} />
                <Text variant="caption">
                    {t('feature.federations.federation-ends-in')}
                </Text>
            </FederationEndingLabel>
            <Text variant="h2" weight="medium">
                {popupInfo.endsInText}
            </Text>
        </FederationEndCard>
    )
}

function FederationStatus({ federation }: { federation: LoadedFederation }) {
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

const FederationEndCard = styled('div', {
    display: 'flex',
    alignItems: 'center',
    padding: `${theme.spacing.md}px ${theme.spacing.lg}px`,
    borderRadius: 16,

    variants: {
        variant: {
            ended: {
                backgroundColor: theme.colors.extraLightGrey,
            },
            default: {
                background: `linear-gradient(-30deg, ${theme.colors.orange200}, ${theme.colors.blue200})`,
            },
        },
    },

    defaultVariants: {
        variant: 'default',
    },
})

const FederationEndingLabel = styled('div', {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
})

const FederationHeader = styled('div', {
    display: 'flex',
    gap: 16,
    alignItems: 'center',
})

const HeaderContent = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
})

const ScrollableContent = styled(ShadowScroller, {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    flex: 1,
    overflowY: 'auto',
})

const Actions = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    paddingTop: 16,
    paddingBottom: 16,

    '@sm': {
        paddingLeft: 16,
        paddingRight: 16,
    },
})

const Content = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    flex: 1,
})

const ChatsContainer = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    width: '100%',
})

export default FederationDetails
