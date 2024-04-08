import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import { Button, FAB, Image, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { ErrorBoundary } from '@fedi/common/components/ErrorBoundary'
import { useNuxStep } from '@fedi/common/hooks/nux'
import {
    fetchChatMembers,
    selectActiveFederationId,
    selectIsMatrixChatEmpty,
    selectMatrixAuth,
    selectMatrixStatus,
} from '@fedi/common/redux'

import { Images } from '../assets/images'
import ChatsList from '../components/feature/chat/ChatsList'
import { NuxTooltip } from '../components/ui/NuxTooltip'
import SvgImage from '../components/ui/SvgImage'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import { MatrixSyncStatus } from '../types'
import {
    NavigationHook,
    RootStackParamList,
    TabsNavigatorParamList,
} from '../types/navigation'

export type Props = BottomTabScreenProps<
    TabsNavigatorParamList & RootStackParamList,
    'Chat'
>

const ChatScreen: React.FC<Props> = () => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const dispatch = useAppDispatch()
    const activeFederationId = useAppSelector(selectActiveFederationId)
    const syncStatus = useAppSelector(selectMatrixStatus)
    const hasMatrixAuth = useAppSelector(s => !!selectMatrixAuth(s))
    const needsChatRegistration = !hasMatrixAuth
    const isChatEmpty = useAppSelector(selectIsMatrixChatEmpty)
    const [hasOpenedNewChat, completeOpenedNewChat] =
        useNuxStep('hasOpenedNewChat')

    useEffect(() => {
        if (activeFederationId) {
            // Here we fetch the roster and store the results in local storage
            dispatch(fetchChatMembers({ federationId: activeFederationId }))
        }
    }, [activeFederationId, dispatch])

    // TODO: reimplement seen message hook for matrix
    // Use this hook only if the screen is in focus
    // const isFocused = useIsFocused()
    // useUpdateLastMessageSeen(isFocused !== true)

    const style = styles(theme)

    if (syncStatus === MatrixSyncStatus.initialSync) {
        return (
            <View style={style.centerContainer}>
                <ActivityIndicator size={16} color={theme.colors.primary} />
                <Text>{t('feature.chat.waiting-for-network')}</Text>
            </View>
        )
    } else if (syncStatus === MatrixSyncStatus.stopped) {
        return (
            <View style={style.centerContainer}>
                <Text style={style.errorText}>
                    {t('errors.chat-connection-unhealthy')}
                </Text>
            </View>
        )
    }

    return (
        <View style={style.container}>
            {needsChatRegistration ? (
                <>
                    <View style={style.registration}>
                        <Image
                            resizeMode="contain"
                            source={Images.IllustrationChat}
                            style={style.emptyImage}
                        />
                        <Text h1 style={style.registrationText}>
                            {t('feature.chat.need-registration-title')}
                        </Text>
                        <Text style={style.registrationText}>
                            {t('feature.chat.need-registration-description')}
                        </Text>
                        <Button
                            fullWidth
                            title={t('feature.chat.register-a-username')}
                            onPress={() => navigation.push('CreateUsername')}
                        />
                    </View>
                </>
            ) : isChatEmpty ? (
                <>
                    <Image
                        resizeMode="contain"
                        source={Images.IllustrationChat}
                        style={style.emptyImage}
                    />
                    <NuxTooltip
                        shouldShow={isChatEmpty && !hasOpenedNewChat}
                        delay={1200}
                        text="New chat"
                        orientation="above"
                        side="right"
                        horizontalOffset={44}
                        verticalOffset={78}
                    />
                </>
            ) : (
                <ErrorBoundary
                    fallback={() => (
                        <View style={style.centerContainer}>
                            <Text style={style.errorText}>
                                {t('errors.chat-list-render-error')}
                            </Text>
                        </View>
                    )}>
                    <ChatsList />
                </ErrorBoundary>
            )}

            {!needsChatRegistration && (
                <FAB
                    icon={
                        <SvgImage name="Plus" color={theme.colors.secondary} />
                    }
                    color={theme.colors.blue}
                    style={style.actionButton}
                    size="large"
                    placement="right"
                    onPress={() => {
                        navigation.navigate('NewMessage')
                        completeOpenedNewChat()
                    }}
                />
            )}
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        emptyImage: {
            width: 200,
            height: 200,
            marginBottom: theme.spacing.xxl,
        },
        actionContainer: {},
        actionButton: {
            elevation: 4,
            shadowRadius: 4,
            shadowColor: theme.colors.primary,
        },
        centerContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        errorText: {
            textAlign: 'center',
        },
        registration: {
            flex: 1,
            width: '100%',
            maxWidth: 320,
            justifyContent: 'center',
            alignItems: 'center',
        },
        registrationText: {
            textAlign: 'center',
            marginBottom: theme.spacing.lg,
        },
    })

export default ChatScreen
