import Link from 'next/link'
import { useEffect } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import ArrowRightIcon from '@fedi/common/assets/svgs/chevron-right.svg'
import ProfileIcon from '@fedi/common/assets/svgs/profile.svg'
import { ErrorBoundary } from '@fedi/common/components/ErrorBoundary'
import { useSyncCurrencyRatesAndCache } from '@fedi/common/hooks/currency'
import { useNuxStep } from '@fedi/common/hooks/nux'
import {
    selectLastSelectedCommunityChats,
    selectLastSelectedCommunity,
    selectMatrixAuth,
    selectOnboardingMethod,
} from '@fedi/common/redux'
import { selectVisibleCommunityMods } from '@fedi/common/redux/mod'
import { selectCanShowSurvey } from '@fedi/common/redux/support'
import stringUtils from '@fedi/common/utils/StringUtils'

import { ContentBlock } from '../components/ContentBlock'
import { FederationAvatar } from '../components/FederationAvatar'
import { FediModTiles } from '../components/FediModTiles'
import { Icon } from '../components/Icon'
import { InstallBanner } from '../components/InstallBanner'
import * as Layout from '../components/Layout'
import { Modal } from '../components/Modal'
import SurveyModal from '../components/SurveyModal'
import { Text } from '../components/Text'
import {
    useAppSelector,
    useDeviceQuery,
    useInstallPromptContext,
    useShowInstallPromptBanner,
} from '../hooks'
import { fedimint } from '../lib/bridge'
import { styled, theme } from '../styles'

function HomePage() {
    const { t } = useTranslation()
    const deferredPrompt = useInstallPromptContext()
    const { isIOS } = useDeviceQuery()
    const { showInstallBanner, handleOnDismiss } = useShowInstallPromptBanner()

    const syncCurrencyRatesAndCache = useSyncCurrencyRatesAndCache(fedimint)

    const [hasSeenDisplayName, completeSeenDisplayName] =
        useNuxStep('displayNameModal')

    const handleOnInstall = async () => {
        await deferredPrompt?.prompt()
    }

    const selectedCommunity = useAppSelector(selectLastSelectedCommunity)
    const selectedCommunityMods = useAppSelector(selectVisibleCommunityMods)
    const matrixAuth = useAppSelector(selectMatrixAuth)
    const newsItems = useAppSelector(s => selectLastSelectedCommunityChats(s))
    const onboardingMethod = useAppSelector(selectOnboardingMethod)
    const canShowSurvey = useAppSelector(selectCanShowSurvey)
    const isNewSeedUser = onboardingMethod !== 'restored'

    // Get first chat message to use as Federation News for now
    // Improvement: Show carousel of announcements to show multiple news items
    const newsItem = newsItems.length > 0 ? newsItems[0] : null

    // Get rates from cache
    useEffect(() => {
        syncCurrencyRatesAndCache()
    }, [syncCurrencyRatesAndCache])

    // TODO: handle if we can't join fedi global community?
    if (!selectedCommunity) return null

    return (
        <ContentBlock>
            <Layout.Root>
                <Layout.Content>
                    <Content>
                        {selectedCommunity && newsItem && (
                            <Section>
                                <Title weight="bold">
                                    {t('feature.home.community-news-title')}
                                </Title>

                                <NewsContainer>
                                    <NewsItem
                                        href={`/chat/room/${newsItem.id}`}>
                                        <NewsItemIcon>
                                            <FederationAvatar
                                                federation={selectedCommunity}
                                                size="sm"
                                            />
                                        </NewsItemIcon>
                                        <NewsItemText>
                                            <Text variant="body" weight="bold">
                                                {stringUtils.truncateString(
                                                    newsItem.name,
                                                    25,
                                                )}
                                            </Text>
                                            {newsItem.preview && (
                                                <Text variant="small">
                                                    {stringUtils.truncateString(
                                                        stringUtils.stripNewLines(
                                                            newsItem.preview
                                                                .body,
                                                        ),
                                                        25,
                                                    )}
                                                </Text>
                                            )}
                                        </NewsItemText>
                                        <NewsItemArrow>
                                            <Icon icon={ArrowRightIcon} />
                                        </NewsItemArrow>
                                    </NewsItem>
                                </NewsContainer>
                            </Section>
                        )}

                        <Section>
                            <Title weight="bold">
                                {t('feature.home.community-mods-title')}
                            </Title>
                            <SubTitle variant="caption">
                                {t('feature.home.community-services-selected')}
                            </SubTitle>
                            <ErrorBoundary fallback={null}>
                                <FediModTiles mods={selectedCommunityMods} />
                            </ErrorBoundary>
                        </Section>
                    </Content>
                </Layout.Content>

                {showInstallBanner && (
                    <InstallBanner
                        title={t('feature.home.pwa-install-banner-title')}
                        description={t(
                            'feature.home.pwa-install-banner-description',
                        )}
                        buttonLabel={t(
                            'feature.home.pwa-install-banner-button-label',
                        )}
                        onInstall={
                            isIOS
                                ? () =>
                                      window.open(
                                          'https://support.fedi.xyz/hc/en-us/articles/27283843087634',
                                          '_blank',
                                      )
                                : handleOnInstall
                        }
                        onClose={handleOnDismiss}
                    />
                )}
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

            {canShowSurvey && <SurveyModal />}
        </ContentBlock>
    )
}

const Content = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    marginTop: 12,
})

const Section = styled('div', {
    marginBottom: 20,
})

const Title = styled(Text, {
    padding: '4px 0',
    fontSize: '20px!important',
})

const SubTitle = styled(Text, {
    color: theme.colors.darkGrey,
})

const NewsContainer = styled('div', {})

const NewsItem = styled(Link, {
    alignItems: 'center',
    background: theme.colors.offWhite100,
    borderRadius: 20,
    boxSizing: 'border-box',
    color: theme.colors.night,
    display: 'flex',
    gap: 10,
    overflow: 'hidden',
    padding: 15,
})

const NewsItemIcon = styled('div', {
    alignItems: 'center',
    display: 'flex',
    minWidth: 30,
})

const NewsItemText = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    textAlign: 'left',
})

const NewsItemArrow = styled('div', {
    alignItems: 'center',
    display: 'flex',
    width: 20,
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

export default HomePage
