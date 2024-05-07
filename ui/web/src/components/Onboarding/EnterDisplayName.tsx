import { useRouter } from 'next/router'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { useDisplayNameForm } from '@fedi/common/hooks/chat'
import {
    selectAuthenticatedMember,
    selectHasSetMatrixDisplayName,
} from '@fedi/common/redux'

import { useAppSelector } from '../../hooks'
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

export const EnterDisplayName: React.FC = () => {
    const { t } = useTranslation()
    const { push } = useRouter()
    const hasSetDisplayName = useAppSelector(selectHasSetMatrixDisplayName)
    const authenticatedMember = useAppSelector(selectAuthenticatedMember)
    const hasLegacyChatData = !!authenticatedMember
    const {
        username,
        isSubmitting,
        handleChangeUsername,
        handleSubmitDisplayName,
    } = useDisplayNameForm(t, fedimint)

    const handleSubmit = useCallback(
        async (ev: React.FormEvent) => {
            ev.preventDefault()
            handleSubmitDisplayName(() => {
                // continue to onboarding complete
                push('/onboarding/image')
            })
        },
        [handleSubmitDisplayName, push],
    )

    if (hasSetDisplayName) {
        return <Redirect path="/onboarding/complete" />
    }

    if (hasLegacyChatData) {
        return <Redirect path="/" />
    }

    return (
        <OnboardingContainer as="form" onSubmit={handleSubmit}>
            <OnboardingContent>
                <Text variant="h2" weight="medium">
                    {t('feature.chat.enter-display-name')}
                </Text>
                <Text>{t('feature.onboarding.username-instructions')}</Text>
                <InputWrapper>
                    <Input
                        label={t('feature.chat.display-name')}
                        value={username}
                        onChange={ev =>
                            handleChangeUsername(ev.currentTarget.value)
                        }
                        disabled={isSubmitting}
                        autoFocus
                        autoCapitalize="off"
                    />
                </InputWrapper>
            </OnboardingContent>
            <OnboardingActions>
                <Button
                    width="full"
                    type="submit"
                    disabled={!username}
                    loading={isSubmitting}>
                    {t('words.continue')}
                </Button>
            </OnboardingActions>
        </OnboardingContainer>
    )
}

const InputWrapper = styled('div', {
    width: '100%',
    marginTop: 16,
})
