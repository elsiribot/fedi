import { useRouter } from 'next/router'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { BIP39_WORD_LIST } from '@fedi/common/constants/bip39'
import { useIsChatSupported } from '@fedi/common/hooks/federation'
import { recoverFromMnemonic, selectActiveFederation } from '@fedi/common/redux'
import { SeedWords } from '@fedi/common/types'

import { Button } from '../../components/Button'
import { RecoverySeedWords } from '../../components/RecoverySeedWords'
import { Text } from '../../components/Text'
import { useAppDispatch, useAppSelector, useToast } from '../../hooks'
import { fedimint } from '../../lib/bridge'
import { styled } from '../../styles'
import { Redirect } from '../Redirect'
import {
    OnboardingActions,
    OnboardingContainer,
    OnboardingContent,
} from './components'

export const PersonalRecovery: React.FC = () => {
    const { t } = useTranslation()
    const { showErrorToast } = useToast()
    const { push } = useRouter()
    const dispatch = useAppDispatch()
    const activeFederation = useAppSelector(selectActiveFederation)
    const isChatSupported = useIsChatSupported()
    const [words, setWords] = useState<SeedWords>([])
    const [isRecovering, setIsRecovering] = useState(false)

    const isValid =
        words.length && words.every(word => BIP39_WORD_LIST.includes(word))

    const handleRecovery = useCallback(async () => {
        setIsRecovering(true)
        try {
            await dispatch(
                recoverFromMnemonic({
                    fedimint,
                    mnemonic: words,
                }),
            ).unwrap()
            push(isChatSupported ? '/onboarding/complete' : '/')
        } catch (err) {
            showErrorToast(err, 'errors.unknown-error')
        }
        setIsRecovering(false)
    }, [words, isChatSupported, dispatch, showErrorToast, push])

    if (!activeFederation) return <Redirect path="/onboarding" />

    return (
        <OnboardingContainer>
            <OnboardingContent fullWidth>
                <Content>
                    <Text variant="h1">
                        {t('feature.recovery.personal-recovery')}
                    </Text>
                    <Text>
                        {t('feature.recovery.personal-recovery-instructions', {
                            federation: activeFederation?.name,
                        })}
                    </Text>
                    <RecoverySeedWords words={words} onChangeWords={setWords} />
                </Content>
            </OnboardingContent>
            <OnboardingActions>
                <Button
                    width="full"
                    onClick={handleRecovery}
                    disabled={!isValid}
                    loading={isRecovering}>
                    {t('feature.recovery.recover-wallet')}
                </Button>
            </OnboardingActions>
        </OnboardingContainer>
    )
}

const Content = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
})
