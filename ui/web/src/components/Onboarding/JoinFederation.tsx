import { useRouter } from 'next/router'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import ScanIcon from '@fedi/common/assets/svgs/scan.svg'
import { joinFederation } from '@fedi/common/redux'

import { useAppDispatch, useToast } from '../../hooks'
import { fedimint } from '../../lib/bridge'
import { styled } from '../../styles'
import { Button } from '../Button'
import { Icon } from '../Icon'
import { QRScanner, ScanResult } from '../QRScanner'
import { Text } from '../Text'
import {
    OnboardingActions,
    OnboardingContainer,
    OnboardingContent,
} from './components'

export const JoinFederation: React.FC = () => {
    const dispatch = useAppDispatch()
    const { t } = useTranslation()
    const { push } = useRouter()
    const { showErrorToast } = useToast()
    const [wantsScan, setWantsScan] = useState(false)
    const [isJoining, setIsJoining] = useState(false)

    const handleCode = useCallback(
        async (code: string) => {
            setIsJoining(true)
            try {
                await dispatch(joinFederation({ fedimint, code })).unwrap()
                push('/onboarding/welcome')
            } catch (err) {
                showErrorToast(err, 'errors.invalid-federation-code')
            }
            setIsJoining(false)
        },
        [push, dispatch, showErrorToast],
    )

    const handlePaste = useCallback(() => {
        const code = prompt(t('feature.federations.paste-federation-code'))
        if (code) {
            handleCode(code)
        }
    }, [handleCode, t])

    const handleScan = useCallback(
        (result: ScanResult) => {
            if (isJoining) return
            handleCode(result.data)
        },
        [handleCode, isJoining],
    )

    return (
        <OnboardingContainer>
            <OnboardingContent>
                {wantsScan ? (
                    <>
                        <Text variant="h2" weight="medium">
                            {t('feature.federations.scan-federation-invite')}
                        </Text>
                        <QRScanner onScan={handleScan} />
                    </>
                ) : (
                    <>
                        <AccessIcon>
                            <Icon size="md" icon={ScanIcon} />
                        </AccessIcon>
                        <Text variant="h2" weight="medium">
                            {t('phrases.allow-camera-access')}
                        </Text>
                        <Text>
                            {t('feature.federations.camera-access-information')}
                        </Text>
                    </>
                )}
            </OnboardingContent>
            <OnboardingActions>
                <Button
                    width="full"
                    variant={wantsScan ? 'primary' : 'tertiary'}
                    onClick={handlePaste}
                    loading={isJoining}>
                    {t(
                        wantsScan
                            ? 'feature.federations.paste-federation-code-instead'
                            : 'feature.federations.paste-federation-code',
                    )}
                </Button>
                {!wantsScan && (
                    <Button
                        width="full"
                        onClick={() => setWantsScan(true)}
                        loading={isJoining}>
                        {t('phrases.allow-camera-access')}
                    </Button>
                )}
            </OnboardingActions>
        </OnboardingContainer>
    )
}

const AccessIcon = styled('div', {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    height: 88,
    marginBottom: 16,
    borderRadius: '100%',
    holoGradient: '400',
})
