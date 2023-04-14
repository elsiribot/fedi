import React from 'react'
import { useTranslation } from 'react-i18next'

import { selectActiveFederation } from '@fedi/common/redux'

import { useAppSelector } from '../../hooks'
import { styled } from '../../styles'
import { Avatar } from '../Avatar'
import { Button } from '../Button'
import { Redirect } from '../Redirect'
import { Text } from '../Text'

export const Welcome: React.FC = () => {
    const { t } = useTranslation()
    const activeFederation = useAppSelector(selectActiveFederation)

    if (!activeFederation) {
        return <Redirect path="/onboarding" />
    }

    return (
        <Container>
            <Top>
                <FederationInfoOuter>
                    <FederationInfoInner>
                        <AvatarWrapper>
                            <Avatar
                                shape="hexagon"
                                size="lg"
                                name={activeFederation.name}
                            />
                        </AvatarWrapper>
                        <Text variant="h2" weight="medium">
                            {t('feature.onboarding.welcome-to-federation')}{' '}
                            {activeFederation.name}
                        </Text>
                        <Text variant="caption">
                            {t('feature.onboarding.welcome-instructions')}
                        </Text>
                    </FederationInfoInner>
                </FederationInfoOuter>
            </Top>
            <Actions>
                <Button variant="tertiary" href="/onboarding/recovery">
                    I am a returning member
                </Button>
                <Button href="/onboarding/username">
                    Join as a new member
                </Button>
            </Actions>
        </Container>
    )
}

const Container = styled('div', {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    height: '100%',
})

const Top = styled('div', {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
})

const outerRadius = 20
const outerPadding = 2
const FederationInfoOuter = styled('div', {
    maxWidth: 340,
    padding: outerPadding,
    borderRadius: outerRadius,
    holoGradient: '900',
})

const FederationInfoInner = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    gap: 8,
    padding: 24,
    background: '#FFF',
    borderRadius: outerRadius - outerPadding,
})

const AvatarWrapper = styled('div', {
    marginBottom: 16,
})

const Actions = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    maxWidth: 320,
    gap: 16,
})
