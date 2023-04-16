import { useRouter } from 'next/router'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { updateFederationCredentials } from '@fedi/common/redux'

import { useAppDispatch } from '../../hooks'
import { styled } from '../../styles'
import { Button } from '../Button'
import { Input } from '../Input'
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

    const handleSubmit = (ev: React.FormEvent) => {
        ev.preventDefault()
        // TODO: Actually register username, currently just spoofs credentials
        dispatch(
            updateFederationCredentials({
                username,
                password: '',
                keypairSeed: '',
            }),
        )
        push('/onboarding/complete')
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
