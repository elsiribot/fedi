import { useRouter } from 'next/router'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

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
    const { t } = useTranslation()
    const { push } = useRouter()
    const [username, setUsername] = useState('')

    const handleSubmit = (ev: React.FormEvent) => {
        // TODO: Actually register username
        ev.preventDefault()
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
                        label="Username"
                        placeholder="Enter username..."
                        value={username}
                        onChange={ev => setUsername(ev.currentTarget.value)}
                        autoFocus
                    />
                </InputWrapper>
            </OnboardingContent>
            <OnboardingActions>
                <Button width="full" type="submit">
                    Create username
                </Button>
            </OnboardingActions>
        </OnboardingContainer>
    )
}

const InputWrapper = styled('div', {
    width: '100%',
    marginTop: 16,
})
