import { useRouter } from 'next/router'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import ScanIcon from '@fedi/common/assets/svgs/scan.svg'

import { styled } from '../../styles'
import { Button } from '../Button'
import { Icon } from '../Icon'
import { QRScanner, ScanResult } from '../QRScanner'
import { Text } from '../Text'

export const JoinFederation: React.FC = () => {
    const { t } = useTranslation()
    const { push } = useRouter()
    const [wantsScan, setWantsScan] = useState(false)

    const handleCode = useCallback(
        (code: string) => {
            // TODO: Validate code, join federation, set it as active federation
            console.log({ code })
            push('/onboarding/welcome')
        },
        [push],
    )

    const handlePaste = useCallback(() => {
        const code = prompt('Please enter your Federation code')
        if (code) {
            handleCode(code)
        }
    }, [handleCode])

    const handleScan = useCallback(
        (result: ScanResult) => {
            handleCode(result.data)
        },
        [handleCode],
    )

    return (
        <Container>
            <CameraAccess>
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
                            <Icon icon={ScanIcon} />
                        </AccessIcon>
                        <Text variant="h2" weight="medium">
                            {t('phrases.allow-camera-access')}
                        </Text>
                        <Text>
                            {t('feature.federations.camera-access-information')}
                        </Text>
                    </>
                )}
            </CameraAccess>
            <Actions>
                <Button
                    width="full"
                    variant={wantsScan ? 'primary' : 'tertiary'}
                    onClick={handlePaste}>
                    {t(
                        wantsScan
                            ? 'feature.federations.paste-federation-code-instead'
                            : 'feature.federations.paste-federation-code',
                    )}
                </Button>
                {!wantsScan && (
                    <Button width="full" onClick={() => setWantsScan(true)}>
                        {t('phrases.allow-camera-access')}
                    </Button>
                )}
            </Actions>
        </Container>
    )
}

const Container = styled('div', {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    width: '100%',
    maxWidth: 320,
})

const CameraAccess = styled('div', {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
})

const AccessIcon = styled('div', {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    height: 88,
    marginBottom: 16,
    borderRadius: '100%',
    holoGradient: '900',
})

const Actions = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    maxWidth: 320,
    gap: 16,
})
