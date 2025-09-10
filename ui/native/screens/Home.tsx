import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { useIsFocused } from '@react-navigation/native'
import { useTheme, type Theme } from '@rneui/themed'
import React, { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'

import { ErrorBoundary } from '@fedi/common/components/ErrorBoundary'
import { useNuxStep } from '@fedi/common/hooks/nux'
import {
    selectCommunityIds,
    selectFederationIds,
    selectLastSelectedCommunity,
    selectOnboardingMethod,
} from '@fedi/common/redux'
import { selectCanShowSurvey } from '@fedi/common/redux/support'
import { getFederationPinnedMessage } from '@fedi/common/utils/FederationUtils'

import FirstTimeCommunityEntryOverlay, {
    FirstTimeCommunityEntryItem,
} from '../components/feature/federations/FirstTimeCommunityEntryOverlay'
import CommunityChats from '../components/feature/home/CommunityChats'
import DisplayNameOverlay from '../components/feature/home/DisplayNameOverlay'
import ShortcutsList from '../components/feature/home/ShortcutsList'
import SurveyOverlay from '../components/feature/home/SurveyOverlay'
import WelcomeMessage from '../components/feature/home/WelcomeMessage'
import Flex from '../components/ui/Flex'
import { useAppSelector } from '../state/hooks'
import type {
    RootStackParamList,
    TabsNavigatorParamList,
} from '../types/navigation'

export type Props = BottomTabScreenProps<
    TabsNavigatorParamList & RootStackParamList,
    'Home'
>

const Home: React.FC<Props> = () => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const isFocused = useIsFocused()

    const selectedCommunity = useAppSelector(selectLastSelectedCommunity)
    const pinnedMessage = getFederationPinnedMessage(
        selectedCommunity?.meta || {},
    )
    const onboardingMethod = useAppSelector(selectOnboardingMethod)
    const canShowSurvey = useAppSelector(selectCanShowSurvey)
    const joinedCommunityCount = useAppSelector(selectCommunityIds).length
    const federationCount = useAppSelector(selectFederationIds).length
    const totalCount = joinedCommunityCount + federationCount

    const homeFirstTimeOverlayItems: FirstTimeCommunityEntryItem[] = [
        {
            icon: 'Wallet',
            text: t('feature.onboarding.one-time-modal-option-1'),
        },
        {
            icon: 'CommunityOutline',
            text: t('feature.onboarding.one-time-modal-option-2'),
        },
    ]

    const [hasSeenDisplayName, completeSeenDisplayName] =
        useNuxStep('displayNameModal')
    const [hasSeenCommunity, completeSeenCommunity] =
        useNuxStep('communityModal')

    /**
     * Guards against showing more than one overlay during the current focus.
     * Reset happens synchronously on the first render **after** focus changes to
     * true, ensuring the next overlay can be evaluated in that same render.
     */
    const overlayShownThisFocus = useRef(false)
    const prevIsFocused = useRef(isFocused)

    // Detect focus gain **before** deciding what to show.
    if (isFocused && !prevIsFocused.current) {
        overlayShownThisFocus.current = false
    }
    prevIsFocused.current = isFocused

    // Don't show any overlay modals if the seed was restored
    const isNewSeedUser = onboardingMethod !== 'restored'

    // Decide which overlay (if any) to show for this render.
    const showDisplayNameOverlay =
        isNewSeedUser && !hasSeenDisplayName && !overlayShownThisFocus.current

    const showCommunityOverlay =
        isNewSeedUser &&
        !hasSeenCommunity &&
        hasSeenDisplayName &&
        totalCount >= 2 &&
        !overlayShownThisFocus.current

    // Wrapper handlers: mark overlay as handled once dismissed so nothing else
    // can appear during the same focus.
    const handleCommunityDismiss = () => {
        overlayShownThisFocus.current = true
        completeSeenCommunity()
    }

    const handleDisplayNameDismiss = () => {
        overlayShownThisFocus.current = true
        completeSeenDisplayName()
    }

    const style = styles(theme)

    // TODO: handle if we can't join fedi global community?
    if (!selectedCommunity) return null

    return (
        <View>
            <ScrollView
                contentContainerStyle={style.container}
                alwaysBounceVertical={false}>
                <Flex gap="lg" fullWidth>
                    {pinnedMessage && (
                        <View style={style.section}>
                            <WelcomeMessage message={pinnedMessage} />
                        </View>
                    )}

                    <View style={style.section}>
                        <CommunityChats />
                    </View>

                    <View style={style.section}>
                        <ErrorBoundary fallback={null}>
                            <ShortcutsList communityId={selectedCommunity.id} />
                        </ErrorBoundary>
                    </View>
                </Flex>
            </ScrollView>

            {/* Overlays */}
            <DisplayNameOverlay
                show={showDisplayNameOverlay}
                onDismiss={handleDisplayNameDismiss}
            />

            <FirstTimeCommunityEntryOverlay
                overlayItems={homeFirstTimeOverlayItems}
                title={t('feature.onboarding.one-time-modal-title')}
                show={showCommunityOverlay}
                onDismiss={handleCommunityDismiss}
            />
            {canShowSurvey && <SurveyOverlay />}
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            alignItems: 'center',
            justifyContent: 'flex-start',
            marginTop: theme.spacing.sm,
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.xl,
            width: '100%',
        },
        section: {
            // borderWidth: 1,
        },
    })

export default Home
