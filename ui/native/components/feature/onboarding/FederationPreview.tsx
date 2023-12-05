import { Button, Card, Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'

import { FederationPreview as FederationPreviewType } from '@fedi/common/types'
import {
    getFederationTosUrl,
    getFederationWelcomeMessage,
    shouldShowJoinFederation,
} from '@fedi/common/utils/FederationUtils'

import { FederationLogo } from '../../ui/FederationLogo'
import HoloGradient from '../../ui/HoloGradient'
import AcceptTermsOfService from './AcceptTermsOfService'

type JoinAs = 'returningMember' | 'newMember'

type Props = {
    federation: FederationPreviewType
    onJoin: (joinAs: JoinAs) => void | Promise<void>
}

// TODO: for v2 we could tell the user "hey, we can see you used to be in this federation.
// we're going to recover your money now"
// just for returning users
const FederationPreview: React.FC<Props> = ({ federation, onJoin }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const [joinAs, setJoinAs] = useState<JoinAs>()
    const [showTerms, setShowTerms] = useState<boolean>(false)
    const showJoinFederation = shouldShowJoinFederation(federation.meta)
    const [isJoining, setIsJoining] = useState(false)
    const tosUrl = getFederationTosUrl(federation.meta)
    const welcomeMessage = getFederationWelcomeMessage(federation.meta)

    if (showTerms) {
        return (
            <AcceptTermsOfService
                onAccept={() => joinAs && onJoin(joinAs)}
                onReject={() => setShowTerms(false)}
                federation={federation}
            />
        )
    }

    const handleJoin = async (joinType: JoinAs) => {
        setIsJoining(true)
        setJoinAs(joinType)
        if (tosUrl) {
            setShowTerms(true)
        } else {
            try {
                await onJoin(joinType)
            } catch {
                /* no-op, onJoin should handle */
            }
        }
        setIsJoining(false)
    }

    return (
        <View style={styles(theme).container}>
            <Card containerStyle={styles(theme).roundedCardContainer}>
                <ScrollView
                    contentContainerStyle={styles(theme).innerCardContainer}>
                    <FederationLogo federation={federation} size={96} />
                    <Text h2 medium style={styles(theme).welcome}>
                        {t('feature.onboarding.welcome-to-federation')}
                    </Text>
                    <Text h2 medium style={styles(theme).welcomeTitle}>
                        {federation?.name}
                    </Text>
                    {welcomeMessage ? (
                        <HoloGradient
                            level="100"
                            style={styles(theme).customWelcomeContainer}
                            gradientStyle={styles(theme).customWelcomeInner}>
                            <Text caption style={styles(theme).welcomeText}>
                                <Trans
                                    components={{
                                        bold: (
                                            <Text
                                                caption
                                                bold
                                                style={
                                                    styles(theme).welcomeText
                                                }
                                            />
                                        ),
                                    }}>
                                    {welcomeMessage}
                                </Trans>
                            </Text>
                        </HoloGradient>
                    ) : (
                        <Text caption style={styles(theme).welcomeText}>
                            {t('feature.onboarding.welcome-instructions')}
                        </Text>
                    )}
                </ScrollView>
            </Card>
            <View style={styles(theme).buttonsContainer}>
                {showJoinFederation ? (
                    <>
                        <Button
                            fullWidth
                            title={t('words.continue')}
                            onPress={() => handleJoin('newMember')}
                            containerStyle={styles(theme).button}
                            disabled={isJoining && joinAs !== 'newMember'}
                            loading={isJoining && joinAs === 'newMember'}
                        />
                    </>
                ) : (
                    <Text caption style={styles(theme).disabledNotice}>
                        {t('feature.onboarding.new-users-disabled-notice')}
                    </Text>
                )}
            </View>
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing.xl,
        },
        button: {
            marginVertical: theme.sizes.xxs,
        },
        buttonsContainer: {
            marginTop: 'auto',
            width: '100%',
            alignItems: 'center',
        },
        disabledNotice: {
            color: theme.colors.red,
            textAlign: 'center',
            width: '100%',
            marginVertical: theme.sizes.md,
        },
        roundedCardContainer: {
            marginTop: 'auto',
            borderRadius: theme.borders.defaultRadius,
            marginHorizontal: 0,
            padding: theme.spacing.xl,
            maxHeight: '60%',
        },
        innerCardContainer: {
            alignItems: 'center',
        },
        welcome: {
            marginTop: theme.spacing.md,
            textAlign: 'center',
        },
        welcomeTitle: {
            marginBottom: theme.spacing.md,
            textAlign: 'center',
        },
        welcomeText: {
            textAlign: 'center',
            lineHeight: 20,
        },
        customWelcomeContainer: {
            borderRadius: theme.spacing.lg,
            overflow: 'hidden',
        },
        customWelcomeInner: {
            padding: theme.spacing.md,
        },
    })

export default FederationPreview
