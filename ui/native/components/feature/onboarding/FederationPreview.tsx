import { Button, Card, Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'

import { FederationPreview as FederationPreviewType } from '@fedi/common/types'
import { shouldShowJoinFederation } from '@fedi/common/utils/FederationUtils'

import { FederationLogo } from '../../ui/FederationLogo'
import HoloGradient from '../../ui/HoloGradient'
import AcceptTermsOfService from './AcceptTermsOfService'

type JoinAs = 'returningMember' | 'newMember'

type Props = {
    federation: FederationPreviewType
    onJoin: (joinAs: JoinAs) => void | Promise<void>
}

const FederationPreview: React.FC<Props> = ({ federation, onJoin }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const [joinAs, setJoinAs] = useState<JoinAs>()
    const [showTerms, setShowTerms] = useState<boolean>(false)
    const showJoinFederation = shouldShowJoinFederation(federation.meta)
    const [isJoining, setIsJoining] = useState(false)
    const federationRecoverySupported = federation.version < 2

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
        if (federation?.meta?.tos_url) {
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
                    {federation?.meta?.welcome_message ? (
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
                                    {federation.meta.welcome_message}
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
                        {federationRecoverySupported && (
                            <Button
                                fullWidth
                                type="clear"
                                title={t(
                                    'feature.onboarding.join-returning-member',
                                )}
                                onPress={() => handleJoin('returningMember')}
                                containerStyle={styles(theme).button}
                                disabled={
                                    isJoining && joinAs !== 'returningMember'
                                }
                                loading={
                                    isJoining && joinAs === 'returningMember'
                                }
                            />
                        )}
                        <Button
                            fullWidth
                            title={t('feature.onboarding.join-new-member')}
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
