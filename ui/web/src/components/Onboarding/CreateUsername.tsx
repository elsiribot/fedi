import { useRouter } from 'next/router'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useIsChatSupported } from '@fedi/common/hooks/federation'
import { authenticateChat, selectActiveFederation } from '@fedi/common/redux'

import { useAppDispatch, useAppSelector } from '../../hooks'
import { fedimint } from '../../lib/bridge'
import { styled } from '../../styles'
import { Button } from '../Button'
import { Input } from '../Input'
import { Redirect } from '../Redirect'
import { Text } from '../Text'
import {
    OnboardingActions,
    OnboardingContainer,
    OnboardingContent,
} from './components'

export const CreateUsername: React.FC = () => {
    const dispatch = useAppDispatch()
    const { t } = useTranslation()
    const { push } = useRouter()
    const [username, setUsername] = useState('')
    const federationId = useAppSelector(selectActiveFederation)?.id
    const isChatSupported = useIsChatSupported()

    if (!federationId) {
        // TODO: Show a toast when this happens?
        return <Redirect path="/onboarding" />
    }
    if (!isChatSupported) {
        return <Redirect path="/onboarding/welcome" />
    }

    const handleSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault()
        try {
            await dispatch(
                authenticateChat({ fedimint, federationId, username }),
            ).unwrap()
            push('/onboarding/complete')
        } catch (err) {
            // TODO: Show error to user?
            console.error(err)
        }
    }

    return (
        <OnboardingContainer as="form" onSubmit={handleSubmit}>
            <OnboardingContent>
                <Text variant="h2" weight="medium">
                    {t('feature.onboarding.create-your-username')}
                </Text>
                <Text>{t('feature.onboarding.username-instructions')}</Text>
                <InputWrapper>
                    <Input
                        label={t('words.username')}
                        placeholder={`${t(
                            'feature.onboarding.enter-username',
                        )}...`}
                        value={username}
                        onChange={ev => setUsername(ev.currentTarget.value)}
                        autoFocus
                    />
                </InputWrapper>
            </OnboardingContent>
            <OnboardingActions>
                <Button width="full" type="submit">
                    {t('feature.onboarding.create-username')}
                </Button>
            </OnboardingActions>
        </OnboardingContainer>
    )
}

const InputWrapper = styled('div', {
    width: '100%',
    marginTop: 16,
})
