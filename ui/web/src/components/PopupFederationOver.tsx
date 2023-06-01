import React from 'react'
import { Trans, useTranslation } from 'react-i18next'

import { usePopupFederationInfo } from '@fedi/common/hooks/federation'
import { selectActiveFederation } from '@fedi/common/redux'

import { useAppSelector } from '../hooks'
import { styled, theme } from '../styles'
import { Avatar } from './Avatar'
import { Button } from './Button'
import { ContentBlock } from './ContentBlock'
import { Text } from './Text'

export const PopupFederationOver: React.FC = () => {
    const { t } = useTranslation()
    const activeFederation = useAppSelector(selectActiveFederation)
    const popupInfo = usePopupFederationInfo()

    if (!activeFederation || !popupInfo) return null

    return (
        <ContentBlock>
            <Container>
                <Avatar
                    id={activeFederation.id}
                    size="lg"
                    shape="hexagon"
                    name={activeFederation.name}
                    holo
                />
                <Text variant="h2">{activeFederation.name}</Text>
                <Ended>{t('feature.popup.ended')}</Ended>
                <Text css={{ marginBottom: 24 }}>
                    <Trans
                        t={t}
                        i18nKey="feature.popup.ended-description"
                        values={{ date: popupInfo.endsAtText }}
                        components={{ bold: <strong /> }}
                    />
                </Text>
                {activeFederation.meta?.tos_url && (
                    <Button
                        width="full"
                        variant="secondary"
                        href={activeFederation.meta.tos_url}>
                        {t('phrases.terms-and-conditions')}
                    </Button>
                )}
            </Container>
        </ContentBlock>
    )
}

const Container = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: 16,
})

const Ended = styled('div', {
    padding: `2px 8px`,
    borderRadius: '30px',
    background: theme.colors.lightGrey,
    color: theme.colors.primary,
    fontSize: theme.fontSizes.caption,
    fontWeight: theme.fontWeights.bold,
})
