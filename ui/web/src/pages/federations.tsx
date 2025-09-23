import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import ProfileIcon from '@fedi/common/assets/svgs/profile.svg'
import WordListIcon from '@fedi/common/assets/svgs/word-list.svg'
import { useSyncCurrencyRatesAndCache } from '@fedi/common/hooks/currency'
import { useNuxStep } from '@fedi/common/hooks/nux'
import {
    selectNonFeaturedFederations,
    selectLastUsedFederation,
    selectMatrixAuth,
    selectOnboardingMethod,
} from '@fedi/common/redux'
import { selectCanShowSurvey } from '@fedi/common/redux/support'

import { Avatar } from '../components/Avatar'
import { ContentBlock } from '../components/ContentBlock'
import FeaturedFederation from '../components/FeaturedFederation'
import FederationTile from '../components/FederationTile'
import { Icon } from '../components/Icon'
import * as Layout from '../components/Layout'
import MainHeaderButtons from '../components/MainHeaderButtons'
import { Modal } from '../components/Modal'
import { RequestPaymentDialog } from '../components/RequestPaymentDialog'
import { SendPaymentDialog } from '../components/SendPaymentDialog'
import SurveyModal from '../components/SurveyModal'
import { Text } from '../components/Text'
import { useAppSelector } from '../hooks'
import { fedimint } from '../lib/bridge'
import { styled, theme } from '../styles'

const BACKUP_REMINDER_MIN_BALANCE = 1000000 // 1000000 msats or 1000 sats

function FederationsPage() {
    const { t } = useTranslation()
    const router = useRouter()

    const syncCurrencyRatesAndCache = useSyncCurrencyRatesAndCache(fedimint)

    const [hasSeenDisplayName, completeSeenDisplayName] =
        useNuxStep('displayNameModal')
    const [hasPerformedPersonalBackup] = useNuxStep(
        'hasPerformedPersonalBackup',
    )

    // Get federation data
    const federations = useAppSelector(selectNonFeaturedFederations)
    const featuredFederation = useAppSelector(selectLastUsedFederation)
    const matrixAuth = useAppSelector(selectMatrixAuth)
    const onboardingMethod = useAppSelector(selectOnboardingMethod)
    const canShowSurvey = useAppSelector(selectCanShowSurvey)
    const isNewSeedUser = onboardingMethod !== 'restored'

    // Get rates from cache
    useEffect(() => {
        syncCurrencyRatesAndCache()
    }, [syncCurrencyRatesAndCache])

    // Redirect if no federations
    if (!featuredFederation && federations.length === 0) {
        router.push('/onboarding')
        return null
    }

    return (
        <ContentBlock>
            <Layout.Root>
                <Layout.Header>
                    <Layout.Title>{t('words.wallets')}</Layout.Title>
                    <MainHeaderButtons
                        onAddPress={() => router.push('/onboarding')}
                    />
                </Layout.Header>
                <Layout.Content>
                    <Content>
                        <FeaturedFederation />

                        <FederationsListWrapper>
                            {federations.map(federation => (
                                <FederationTile
                                    key={federation.id}
                                    federation={federation}
                                />
                            ))}
                        </FederationsListWrapper>
                    </Content>
                </Layout.Content>
            </Layout.Root>

            {/* Modal - Show user their display name */}
            <Modal
                open={
                    isNewSeedUser &&
                    !hasSeenDisplayName &&
                    !!matrixAuth?.displayName
                }
                onClick={completeSeenDisplayName}
                title={t('feature.home.display-name')}
                description={matrixAuth?.displayName}>
                <ModalContent aria-label="test">
                    <ModalIconWrapper>
                        <Icon icon={ProfileIcon} size="xl" />
                    </ModalIconWrapper>
                    <ModalTextWrapper>
                        <Text variant="h2">
                            {t('feature.home.display-name')}
                        </Text>
                        <Text variant="h2">
                            &quot;{matrixAuth?.displayName}&quot;
                        </Text>
                    </ModalTextWrapper>
                    <ModalTextWithIcon
                        variant="body"
                        css={{ color: theme.colors.darkGrey }}>
                        <Trans
                            i18nKey="feature.home.profile-change-icon"
                            components={{
                                icon: <ModalIcon icon={ProfileIcon} />,
                            }}
                        />
                    </ModalTextWithIcon>
                </ModalContent>
            </Modal>

            {/* Modal - Ask user to backup if their balance is above 1000 sats */}
            <Modal
                open={
                    !!featuredFederation &&
                    featuredFederation.balance > BACKUP_REMINDER_MIN_BALANCE &&
                    !hasPerformedPersonalBackup
                }
                onClick={() => router.push('/settings/backup/personal')}
                title={t('feature.home.backup-wallet-title')}
                description={t('feature.home.backup-wallet-description')}>
                <ModalContent aria-label="test">
                    <ModalIconWrapper>
                        <Avatar
                            size="md"
                            id=""
                            name="list"
                            holo
                            icon={WordListIcon}
                            css={{ alignSelf: 'center' }}
                        />
                    </ModalIconWrapper>
                    <ModalTextWrapper>
                        <Text variant="h2">
                            {t('feature.home.backup-wallet-title')}
                        </Text>
                    </ModalTextWrapper>
                    <Text variant="body" css={{ color: theme.colors.darkGrey }}>
                        {t('feature.home.backup-wallet-description')}
                    </Text>
                </ModalContent>
            </Modal>

            {canShowSurvey && <SurveyModal />}
            <RequestPaymentDialog
                open={router.pathname === '/request'}
                onOpenChange={() => router.push('/federations')}
            />
            <SendPaymentDialog
                open={router.pathname === '/send'}
                onOpenChange={() => router.push('/federations')}
            />
        </ContentBlock>
    )
}

const Content = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
})

const FederationsListWrapper = styled('div', {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
})

const ModalContent = styled('div', {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
})

const ModalTextWrapper = styled('div', {
    marginBottom: 10,
})

const ModalTextWithIcon = styled(Text, {
    alignItems: 'center',
    display: 'flex',
})

const ModalIcon = styled(Icon, {
    margin: '0 3px',
    width: 20,
})

const ModalIconWrapper = styled('div', {
    alignItems: 'center',
    borderRadius: '50%',
    boxSizing: 'border-box',
    display: 'flex',
    height: 50,
    holoGradient: '600',
    justifyContent: 'center',
    marginBottom: 10,
    padding: 5,
    overflow: 'hidden',
    width: 50,
})

export default FederationsPage
