import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { useIsFocused, useNavigation } from '@react-navigation/native'
import { FAB, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { ErrorBoundary } from '@fedi/common/components/ErrorBoundary'
import { useUpdateLastMessageSeen } from '@fedi/common/hooks/chat'
import {
    fetchChatMembers,
    selectActiveFederationId,
    selectChatConnectionOptions,
    selectWebsocketIsHealthy,
} from '@fedi/common/redux'

import ChatsList from '../components/feature/chat/ChatsList'
import SvgImage from '../components/ui/SvgImage'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import { reset } from '../state/navigation'
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
    const isFocused = useIsFocused()
    const websocketIsHealthy = useAppSelector(selectWebsocketIsHealthy)
    const dispatch = useAppDispatch()
    const activeFederationId = useAppSelector(selectActiveFederationId)
    const activeChatConnectionOptions = useAppSelector(
        selectChatConnectionOptions,
    )

    // Navigate back to home screen if this federation doesn't support chat
    useEffect(() => {
        if (!activeChatConnectionOptions) {
            navigation.dispatch(reset('TabsNavigator'))
        }
    }, [activeChatConnectionOptions, navigation])

    useEffect(() => {
        if (websocketIsHealthy && activeFederationId) {
            // Here we fetch the roster and store the results in local storage
            dispatch(fetchChatMembers({ federationId: activeFederationId }))
        }
    }, [activeFederationId, dispatch, websocketIsHealthy])

    // Use this hook only if the screen is in focus
    useUpdateLastMessageSeen(isFocused !== true)

    return (
        <View style={styles(theme).container}>
            <ErrorBoundary
                fallback={() => (
                    <View style={styles(theme).errorContainer}>
                        <Text style={styles(theme).error}>
                            {t('errors.chat-list-render-error')}
                        </Text>
                    </View>
                )}>
                <ChatsList />
            </ErrorBoundary>

            <FAB
                icon={<SvgImage name="Plus" color={theme.colors.secondary} />}
                color={theme.colors.blue}
                style={styles(theme).actionButton}
                size="large"
                placement="right"
                onPress={() => {
                    navigation.navigate('NewMessage')
                }}
            />
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        actionButton: {
            elevation: 4,
            shadowRadius: 4,
            shadowColor: theme.colors.primary,
        },
        errorContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        error: {
            color: theme.colors.red,
        },
    })

export default ChatScreen
