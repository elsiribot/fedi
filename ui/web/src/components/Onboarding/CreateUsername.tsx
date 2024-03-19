import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useToast } from '@fedi/common/hooks/toast'
import {
    selectActiveFederationId,
    selectMatrixAuth,
    setMatrixDisplayName,
} from '@fedi/common/redux'
import { makeLog } from '@fedi/common/utils/log'

import { useAppDispatch, useAppSelector } from '../../hooks'
import { styled } from '../../styles'
import { Button } from '../Button'
import { HoloLoader } from '../HoloLoader'
import { Input } from '../Input'
import { Redirect } from '../Redirect'
import { Text } from '../Text'
import {
    OnboardingActions,
    OnboardingContainer,
    OnboardingContent,
} from './components'

const log = makeLog('CreateUsername')

export const CreateUsername: React.FC = () => {
    const dispatch = useAppDispatch()
    const { t } = useTranslation()
    const { push } = useRouter()
    const toast = useToast()
    const matrixAuth = useAppSelector(selectMatrixAuth)
    const [username, setUsername] = useState(matrixAuth?.displayName || '')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const federationId = useAppSelector(selectActiveFederationId)

    useEffect(() => {
        if (!matrixAuth) return
        const { displayName, userId } = matrixAuth
        if (!userId.includes(displayName)) {
            setUsername(displayName)
        }
    }, [matrixAuth])

    // TODO: Allow username registration before joining a federation, chat does
    // not require federation membership.
    if (!federationId) {
        return <Redirect path="/onboarding" />
    }

    const handleSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault()
        setIsSubmitting(true)
        try {
            await dispatch(
                setMatrixDisplayName({ displayName: username }),
            ).unwrap()
            push('/onboarding/complete')
        } catch (err) {
            log.error('handleSubmit', err)
            toast.error(t, err, 'errors.unknown-error')
        }
        setIsSubmitting(false)
    }

    let content: React.ReactNode
    if (!matrixAuth) {
        content = (
            <OnboardingContent>
                <HoloLoader size="xl" />
            </OnboardingContent>
        )
    } else {
        content = (
            <>
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
                        {t('feature.onboarding.create-username')}
                    </Button>
                </OnboardingActions>
            </>
        )
    }

    return (
        <OnboardingContainer as="form" onSubmit={handleSubmit}>
            {content}
        </OnboardingContainer>
    )
}

const InputWrapper = styled('div', {
    width: '100%',
    marginTop: 16,
})
