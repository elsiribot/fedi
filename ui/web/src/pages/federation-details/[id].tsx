import { useRouter } from 'next/router'
import { useTranslation } from 'react-i18next'

import { selectDefaultChats, selectLoadedFederation } from '@fedi/common/redux'
import { Sats } from '@fedi/common/types'
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
import FederationEndIndicator from '../../components/FederationDetails/FederationEndIndicator'
import { FederationStatus } from '../../components/FederationDetails/FederationStatus'
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
