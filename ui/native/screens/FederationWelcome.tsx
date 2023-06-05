import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Card, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import {
    selectActiveFederation,
    selectAuthenticatedMember,
    selectChatConnectionOptions,
} from '@fedi/common/redux'

import { FederationLogo } from '../components/ui/FederationLogo'
import HoloGradient from '../components/ui/HoloGradient'
import { SvgImageSize } from '../components/ui/SvgImage'
import { useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'FederationWelcome'
>

const FederationWelcome: React.FC<Props> = ({ navigation }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const activeFederation = useAppSelector(selectActiveFederation)
    const activeChatConnectionOptions = useAppSelector(
        selectChatConnectionOptions,
    )
    const authenticatedMember = useAppSelector(selectAuthenticatedMember)

    return (
        <View style={styles(theme).container}>
            <Card containerStyle={styles(theme).roundedCardContainer}>
                <View style={styles(theme).innerCardContainer}>
                    <FederationLogo
                        federation={activeFederation}
                        size={SvgImageSize.xl}
                    />
                    {/*refer to below image style for above image*/}
                    <Text h2 medium style={styles(theme).welcome}>
                        {t('feature.onboarding.welcome-to-federation')}
                    </Text>
                    <Text h2 medium style={styles(theme).welcomeTitle}>
                        {activeFederation?.name}
                    </Text>
                    {activeFederation?.meta?.welcome_message ? (
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
                                    {activeFederation.meta.welcome_message}
                                </Trans>
                            </Text>
                        </HoloGradient>
                    ) : (
                        <Text caption style={styles(theme).welcomeText}>
                            {/*
                        TODO: Is this welcome text customizable by the
                        federation? If so, fetch from bridge
                    */}
                            {t('feature.onboarding.welcome-instructions')}
                        </Text>
                    )}
                </View>
            </Card>
            <View style={styles(theme).buttonsContainer}>
                <Button
                    fullWidth
                    type="clear"
                    title={t('feature.onboarding.join-returning-member')}
                    onPress={() => {
                        navigation.navigate('ChooseRecoveryMethod')
                    }}
                    containerStyle={styles(theme).button}
                />
                <Button
                    fullWidth
                    title={t('feature.onboarding.join-new-member')}
                    onPress={() => {
                        if (
                            activeChatConnectionOptions &&
                            authenticatedMember === null
                        ) {
                            navigation.navigate('CreateUsername')
                        } else {
                            navigation.navigate('TabsNavigator')
                        }
                    }}
                    containerStyle={styles(theme).button}
                />
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
        image: {
            height: 100,
            width: 100,
            resizeMode: 'contain',
        },
        roundedCardContainer: {
            marginTop: 'auto',
            borderRadius: theme.borders.defaultRadius,
            width: '100%',
            marginHorizontal: 0,
            padding: theme.spacing.xl,
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

export default FederationWelcome
