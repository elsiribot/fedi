import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Divider, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Linking, StyleSheet } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'

import { theme as fediTheme } from '@fedi/common/constants/theme'
import { usePopupFederationInfo } from '@fedi/common/hooks/federation'
import {
    selectDefaultChats,
    selectIsInternetUnreachable,
    selectLoadedFederation,
} from '@fedi/common/redux'
import {
    ChatType,
    Federation,
    LoadedFederation,
    MatrixRoom,
    Sats,
} from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'
import {
    getFederationMaxBalanceMsats,
    getFederationMaxInvoiceMsats,
    getFederationTosUrl,
    getFederationWelcomeMessage,
} from '@fedi/common/utils/FederationUtils'

import { FederationLogo } from '../components/feature/federations/FederationLogo'
import FederationStatusIndicator from '../components/feature/federations/FederationStatusIndicator'
import DefaultChatTile from '../components/feature/home/DefaultChatTile'
import Flex from '../components/ui/Flex'
import { SafeAreaContainer } from '../components/ui/SafeArea'
import ShadowScrollView from '../components/ui/ShadowScrollView'
import SvgImage from '../components/ui/SvgImage'
import { useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'FederationDetails'
>

const FederationDetails: React.FC<Props> = ({ route }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { federationId } = route.params

    const federation = useAppSelector(s =>
        selectLoadedFederation(s, federationId),
    )
    const federationChats = useAppSelector(s =>
        selectDefaultChats(s, federationId),
    )
    const navigation = useNavigation()
    const handleOpenChat = (chat: MatrixRoom) => {
        navigation.navigate('ChatRoomConversation', {
            roomId: chat.id,
            chatType: chat.directUserId ? ChatType.direct : ChatType.group,
        })
    }

    if (!federation) return null

    const welcomeMessage = getFederationWelcomeMessage(federation.meta)
    const tosUrl = getFederationTosUrl(federation.meta)
    const maxBalanceMsats = getFederationMaxBalanceMsats(federation?.meta)
    const maxInvoiceMsats = getFederationMaxInvoiceMsats(federation?.meta)

    const walletBalance: Sats = maxBalanceMsats
        ? ((maxBalanceMsats / 1000) as Sats)
        : (1_000_000_000 as Sats)

    const spendLimit: Sats = maxInvoiceMsats
        ? ((maxInvoiceMsats / 1000) as Sats)
        : (1_000_000_000 as Sats)

    const style = styles(theme)

    return (
        <SafeAreaContainer edges="notop">
            <Flex gap="lg" style={style.header}>
                <Flex row align="center" gap="lg">
                    <FederationLogo federation={federation} size={72} />
                    <Flex grow shrink>
                        <Text h2 medium maxFontSizeMultiplier={1.2}>
                            {federation.name}
                        </Text>
                    </Flex>
                </Flex>
                <Flex gap="md">
                    <FederationEndIndicator federation={federation} />
                    <FederationStatus federation={federation} />
                </Flex>
            </Flex>
            <ShadowScrollView
                style={style.scrollContent}
                contentContainerStyle={style.scrollContentBody}>
                {federationChats.length > 0 && (
                    <Flex gap="sm" fullWidth>
                        <Text bold h2>
                            {t('feature.chat.federation-news')}
                        </Text>
                        {federationChats.map((chat, idx) => (
                            <DefaultChatTile
                                key={`chat-tile-${idx}`}
                                room={chat}
                                onSelect={handleOpenChat}
                                federationOrCommunity={federation}
                            />
                        ))}
                    </Flex>
                )}
                {welcomeMessage && (
                    <Text maxFontSizeMultiplier={1.2}>{welcomeMessage}</Text>
                )}
                <Text maxFontSizeMultiplier={1.2}>
                    {t('phrases.wallet-balance', {
                        balance: amountUtils.formatSats(walletBalance),
                    })}
                </Text>
                <Text maxFontSizeMultiplier={1.2}>
                    {t('phrases.spend-limit', {
                        limit: amountUtils.formatSats(spendLimit),
                    })}
                </Text>
            </ShadowScrollView>
            <Flex style={style.actionsContainer}>
                {tosUrl && (
                    <Button
                        bubble
                        fullWidth
                        outline
                        onPress={() => Linking.openURL(tosUrl)}>
                        <Text adjustsFontSizeToFit medium numberOfLines={1}>
                            {t(
                                'feature.federations.federation-terms-and-conditions',
                            )}
                        </Text>
                    </Button>
                )}
            </Flex>
        </SafeAreaContainer>
    )
}

const FederationStatus = ({ federation }: { federation: LoadedFederation }) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const style = styles(theme)

    const status = federation.status || 'offline'
    const caption = t(`feature.federations.connection-status-${status}`)
    const isOffline = useAppSelector(selectIsInternetUnreachable)

    return (
        <Flex gap="sm" style={style.federationStatusCard}>
            <Flex row align="center" justify="between">
                <Flex grow shrink>
                    <Text caption maxFontSizeMultiplier={1.2}>
                        {isOffline
                            ? t('feature.federations.last-known-status')
                            : `${t('words.status')}:`}
                    </Text>
                </Flex>
                <FederationStatusIndicator status={status} />
            </Flex>
            <Divider />
            <Text caption>
                {isOffline
                    ? t('feature.federations.please-reconnect')
                    : caption}
            </Text>
        </Flex>
    )
}

const FederationEndIndicator = ({ federation }: { federation: Federation }) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const popupInfo = usePopupFederationInfo(federation?.meta || {})

    const style = styles(theme)

    if (!popupInfo) return null

    if (popupInfo.ended) {
        return (
            <Flex
                style={[style.federationEndedCard, style.popupFederationCard]}>
                <Text caption>
                    {popupInfo?.endedMessage || (
                        <Trans
                            t={t}
                            i18nKey="feature.popup.ended-description"
                            values={{ date: popupInfo?.endsAtText }}
                            components={{ bold: <Text caption bold /> }}
                        />
                    )}
                </Text>
            </Flex>
        )
    }

    return (
        <LinearGradient
            start={{ x: 0.1, y: 1 }}
            end={{ x: 0.9, y: 0 }}
            colors={[...fediTheme.skyLinearGradient]}
            style={style.popupFederationCard}>
            <Flex row gap="sm" align="center">
                <SvgImage name="Clock" size={16} />
                <Text caption>
                    {t('feature.federations.federation-ends-in')}
                </Text>
            </Flex>
            <Text h2 medium>
                {popupInfo.endsInText}
            </Text>
        </LinearGradient>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        scrollContent: {
            flex: 1,
        },
        scrollContentBody: {
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            gap: theme.spacing.lg,
        },
        header: {
            paddingVertical: theme.spacing.lg,
        },
        federationStatusCard: {
            backgroundColor: theme.colors.offWhite100,
            borderRadius: 20,
            padding: theme.spacing.md,
        },
        popupFederationCard: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.spacing.md,
            paddingVertical: theme.spacing.md,
            paddingHorizontal: theme.spacing.lg,
            borderRadius: theme.borders.defaultRadius,
        },
        federationEndedCard: {
            backgroundColor: theme.colors.extraLightGrey,
        },
        actionsContainer: {
            paddingTop: theme.spacing.lg,
        },
    })

export default FederationDetails
