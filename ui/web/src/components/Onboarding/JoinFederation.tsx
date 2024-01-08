import { useRouter } from 'next/router'
import React, { useCallback, useState, useEffect } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import ScanIcon from '@fedi/common/assets/svgs/scan.svg'
import { useIsChatSupported } from '@fedi/common/hooks/federation'
import {
    joinFederation,
    selectFederations,
    setActiveFederationId,
} from '@fedi/common/redux'
import { FederationPreview } from '@fedi/common/types'
import {
    getFederationPreview,
    getFederationTosUrl,
    getFederationWelcomeMessage,
    getIsFederationSupported,
} from '@fedi/common/utils/FederationUtils'
import { makeLog } from '@fedi/common/utils/log'

import { useRouteState } from '../../context/RouteStateContext'
import { useAppDispatch, useAppSelector, useToast } from '../../hooks'
import { fedimint } from '../../lib/bridge'
import { styled, theme } from '../../styles'
import { Button } from '../Button'
import { FederationAvatar } from '../FederationAvatar'
import { Icon } from '../Icon'
import { QRScanner, ScanResult } from '../QRScanner'
import { Text } from '../Text'
import { TermsOfService } from './TermsOfService'
import {
    OnboardingActions,
    OnboardingContainer,
    OnboardingContent,
} from './components'

const log = makeLog('JoinFederation')

export const JoinFederation: React.FC = () => {
    const dispatch = useAppDispatch()
    const routeState = useRouteState('/onboarding/join')
    const { t } = useTranslation()
    const { push } = useRouter()
    const { showErrorToast, showToast } = useToast()
    const [wantsScan, setWantsScan] = useState(false)
    const [isFetchingPreview, setIsFetchingPreview] = useState(false)
    const [isJoining, setIsJoining] = useState(false)
    const [hasAcceptedTos, setHasAcceptedTos] = useState(false)
    const [federationPreview, setFederationPreview] =
        useState<FederationPreview>()
    const isChatSupported = useIsChatSupported(federationPreview)
    const federationIds = useAppSelector(s =>
        selectFederations(s).map(f => f.id),
    )

    const handleCode = useCallback(
        async (code: string) => {
            setIsFetchingPreview(true)
            try {
                const fed = await getFederationPreview(code, fedimint)
                if (federationIds.includes(fed.id)) {
                    dispatch(setActiveFederationId(fed.id))
                    push('/')
                    showToast(t('errors.you-have-already-joined'))
                } else {
                    setFederationPreview(fed)
                }
            } catch (err) {
                log.error('handleCode', err)
                showErrorToast(err, 'errors.invalid-federation-code')
            }
            setIsFetchingPreview(false)
        },
        [federationIds, dispatch, push, showErrorToast, showToast, t],
    )

    // If they came here with route state, paste the code for them
    useEffect(() => {
        if (!routeState) return
        handleCode(routeState.data.invite)
    }, [routeState, handleCode])

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

    const handleJoin = useCallback(
        async (nextHref: string) => {
            setIsJoining(true)
            try {
                if (!federationPreview) throw new Error()
                await dispatch(
                    joinFederation({
                        fedimint,
                        code: federationPreview.inviteCode,
                    }),
                ).unwrap()
                push(nextHref)
            } catch (err) {
                log.error('handleJoin', err)
                showErrorToast(err, 'errors.invalid-federation-code')
                setIsJoining(false)
            }
        },
        [federationPreview, push, dispatch, showErrorToast],
    )

    let content: React.ReactNode
    let actions: React.ReactNode
    if (!federationPreview) {
        content = (
            <>
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
            </>
        )
        actions = (
            <>
                <Button
                    width="full"
                    variant={wantsScan ? 'primary' : 'tertiary'}
                    onClick={handlePaste}
                    loading={isFetchingPreview}>
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
                        loading={isFetchingPreview}>
                        {t('phrases.allow-camera-access')}
                    </Button>
                )}
            </>
        )
    } else if (!getIsFederationSupported(federationPreview)) {
        content = (
            <FederationPreviewOuter>
                <FederationPreviewInner>
                    <AvatarWrapper>
                        <FederationAvatar
                            federation={{
                                id: federationPreview.id,
                                name: federationPreview.name,
                                meta: federationPreview.meta,
                            }}
                            size="lg"
                        />
                    </AvatarWrapper>
                    <Text variant="h2" weight="medium">
                        {federationPreview.name}
                    </Text>
                    <UnsupportedBadge>
                        <Text variant="caption" weight="medium">
                            {t('words.unsupported')}
                        </Text>
                    </UnsupportedBadge>
                    <Text variant="caption">
                        {t('feature.onboarding.unsupported-notice')}
                    </Text>
                </FederationPreviewInner>
            </FederationPreviewOuter>
        )

        actions = (
            <>
                <Button
                    width="full"
                    onClick={() => {
                        setIsJoining(false)
                        setFederationPreview(undefined)
                    }}>
                    {t('words.okay')}
                </Button>
            </>
        )
    } else {
        const tosUrl = getFederationTosUrl(federationPreview.meta)

        if (tosUrl && !hasAcceptedTos) {
            return (
                <TermsOfService
                    tosUrl={tosUrl}
                    onAccept={() => {
                        setHasAcceptedTos(true)
                    }}
                />
            )
        }

        const welcomeMessage = getFederationWelcomeMessage(
            federationPreview.meta,
        )
        const memberStatus = federationPreview.returningMemberStatus.type
        const welcomeTitle =
            memberStatus === 'returningMember'
                ? t('feature.onboarding.welcome-back-to-federation')
                : t('feature.onboarding.welcome-to-federation')
        const welcomeInstructions =
            memberStatus === 'newMember'
                ? t('feature.onboarding.welcome-instructions-new')
                : memberStatus === 'returningMember'
                ? t('feature.onboarding.welcome-instructions-returning')
                : t('feature.onboarding.welcome-instructions-unknown')
        content = (
            <FederationPreviewOuter>
                <FederationPreviewInner>
                    <AvatarWrapper>
                        <FederationAvatar
                            federation={{
                                id: federationPreview.id,
                                name: federationPreview.name,
                                meta: federationPreview.meta,
                            }}
                            size="lg"
                        />
                    </AvatarWrapper>
                    <Text variant="h2" weight="medium">
                        {welcomeTitle} {federationPreview.name}
                    </Text>
                    {welcomeMessage ? (
                        <CustomWelcomeMessage>
                            <Trans components={{ bold: <strong /> }}>
                                {welcomeMessage}
                            </Trans>
                        </CustomWelcomeMessage>
                    ) : (
                        <Text variant="caption">{welcomeInstructions}</Text>
                    )}
                </FederationPreviewInner>
            </FederationPreviewOuter>
        )

        let joinNewMemberHref = '/'
        if (isChatSupported) {
            joinNewMemberHref = '/onboarding/username'
        }
        actions = (
            <>
                <Button
                    width="full"
                    onClick={() => handleJoin(joinNewMemberHref)}
                    loading={isJoining}>
                    {t('words.continue')}
                </Button>
            </>
        )
    }

    return (
        <OnboardingContainer>
            <OnboardingContent>{content}</OnboardingContent>
            <OnboardingActions>{actions}</OnboardingActions>
        </OnboardingContainer>
    )
}

const AccessIcon = styled('div', {
    flex: 'none',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    height: 88,
    marginBottom: 16,
    borderRadius: '100%',
    holoGradient: '400',
})

const previewRadius = 20
const previewPadding = 2
const FederationPreviewOuter = styled('div', {
    padding: previewPadding,
    borderRadius: previewRadius,
    holoGradient: '900',
})

const FederationPreviewInner = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    gap: 8,
    padding: 24,
    background: '#FFF',
    borderRadius: previewRadius - previewPadding,
})

const CustomWelcomeMessage = styled('div', {
    holoGradient: '400',
    padding: 16,
    borderRadius: 16,
    textAlign: 'center',
    fontSize: theme.fontSizes.caption,
    lineHeight: '20px',
})

const AvatarWrapper = styled('div', {
    marginBottom: 16,
})

const UnsupportedBadge = styled('div', {
    background: theme.colors.red,
    color: theme.colors.white,
    borderRadius: 16,
    padding: `${theme.space.xs} ${theme.space.sm}`,
})
