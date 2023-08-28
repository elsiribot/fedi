import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useIsFocused } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React, {
    MutableRefObject,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
    AppState,
    AppStateStatus,
    Pressable,
    StyleSheet,
    View,
} from 'react-native'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'

import { usePopupFederationInfo } from '@fedi/common/hooks/federation'
import {
    refreshFederationsMetadata,
    selectActiveFederation,
    selectAllChatMessages,
    selectChatConnectionOptions,
    selectChatLastSeenMessageId,
} from '@fedi/common/redux'
import { getLatestMessage } from '@fedi/common/utils/chat'

import SettingsHeader from '../components/feature/admin/SettingsHeader'
import ChatHeader from '../components/feature/chat/ChatHeader'
import SelectedFederationHeader from '../components/feature/federations/SelectedFederationHeader'
import HomeHeader from '../components/feature/home/HomeHeader'
import SvgImage from '../components/ui/SvgImage'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import {
    RootStackParamList,
    TabsNavigatorParamList,
    TABS_NAVIGATOR_ID,
} from '../types/navigation'
import ChatScreen from './ChatScreen'
import Home from './Home'
import Settings from './Settings'

export type Props = NativeStackScreenProps<RootStackParamList, 'TabsNavigator'>

const Tab = createBottomTabNavigator<TabsNavigatorParamList>()

const TabsNavigator: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const isFocused = useIsFocused()
    const insets = useSafeAreaInsets()
    const [offline] = useState(false)
    const { toast } = useEnvironmentContext().state
    const connectionOptions = useAppSelector(selectChatConnectionOptions)
    const lastSeenMessageId = useAppSelector(selectChatLastSeenMessageId)
    const messages = useAppSelector(selectAllChatMessages)
    const activeFederation = useAppSelector(selectActiveFederation)
    const popupInfo = usePopupFederationInfo()
    const dispatch = useAppDispatch()
    const appStateRef = useRef<AppStateStatus>(
        AppState.currentState,
    ) as MutableRefObject<AppStateStatus>

    // If the popup federation has ended, redirect user to end screen.
    useEffect(() => {
        if (isFocused && popupInfo?.ended) {
            navigation.navigate('PopupFederationEnded')
        }
    }, [isFocused, navigation, popupInfo])

    // This logic is needed refresh federation metadata
    useEffect(() => {
        // Subscribe to changes in AppState to detect when app goes from
        // background to foreground
        const subscription = AppState.addEventListener(
            'change',
            nextAppState => {
                if (
                    appStateRef.current.match(/inactive|background/) &&
                    nextAppState === 'active'
                ) {
                    dispatch(refreshFederationsMetadata())
                }
                appStateRef.current = nextAppState
            },
        )
        return () => subscription.remove()
    }, [dispatch])

    // Check if our last seen message doesn't line up with the last message
    const hasUnseenMessages = useMemo(() => {
        if (!messages.length) return false
        const lastMessage = getLatestMessage(messages)
        return !!lastMessage && lastMessage.id !== lastSeenMessageId
    }, [messages, lastSeenMessageId])

    // If we don't have a selected federation, there's nothing to display here
    // Redirect user to splash screen and render nothing.
    if (!activeFederation) {
        navigation.navigate('Splash')
        return <View />
    }

    return (
        <>
            <SelectedFederationHeader />
            <Tab.Navigator
                initialRouteName="Home"
                id={TABS_NAVIGATOR_ID}
                screenOptions={({ route }) => ({
                    tabBarButton: props => {
                        switch (route.name) {
                            case 'Home':
                                return <Pressable {...props} />
                            case 'Chat':
                                if (connectionOptions) {
                                    return <Pressable {...props} />
                                } else {
                                    return (
                                        <Pressable
                                            {...props}
                                            style={[
                                                props.style,
                                                styles(theme, insets)
                                                    .disabledIcon,
                                            ]}
                                            onPress={() => {
                                                toast?.show(
                                                    t(
                                                        'errors.chat-unavailable',
                                                    ),
                                                    3000,
                                                )
                                            }}
                                        />
                                    )
                                }
                            case 'Settings':
                                return <Pressable {...props} />
                            default:
                                return null
                        }
                    },
                    tabBarIcon: ({ focused }) => {
                        switch (route.name) {
                            case 'Home':
                                return (
                                    <SvgImage
                                        name={focused ? 'HomeFilled' : 'Home'}
                                        containerStyle={
                                            styles(theme, insets)
                                                .tabBarIconContainer
                                        }
                                        color={
                                            focused
                                                ? theme.colors.primary
                                                : theme.colors.primaryLight
                                        }
                                    />
                                )
                            case 'Chat':
                                return (
                                    <SvgImage
                                        name={focused ? 'ChatFilled' : 'Chat'}
                                        containerStyle={
                                            styles(theme, insets)
                                                .tabBarIconContainer
                                        }
                                        color={
                                            focused
                                                ? theme.colors.primary
                                                : theme.colors.primaryLight
                                        }
                                    />
                                )
                            case 'Settings':
                                return (
                                    <SvgImage
                                        name={focused ? 'CogFilled' : 'Cog'}
                                        containerStyle={
                                            styles(theme, insets)
                                                .tabBarIconContainer
                                        }
                                        color={
                                            focused
                                                ? theme.colors.primary
                                                : theme.colors.primaryLight
                                        }
                                    />
                                )
                            default:
                                return null
                        }
                    },
                    tabBarActiveTintColor: theme.colors.primary,
                    tabBarInactiveTintColor: theme.colors.primaryLight,
                    tabBarStyle: styles(theme, insets).tabBar,
                    tabBarItemStyle: styles(theme, insets).tabBarItem,
                    headerTitleStyle: theme.components.Text.style,
                    tabBarLabelStyle: styles(theme, insets).tabBarLabel,
                    tabBarBadgeStyle: styles(theme, insets).tabBarBadge,
                })}>
                <Tab.Screen
                    name="Home"
                    initialParams={{ offline }}
                    options={() => ({
                        title: t('words.home'),
                        header: () => <HomeHeader />,
                    })}>
                    {props => <Home {...props} offline={offline} />}
                </Tab.Screen>
                <Tab.Screen
                    name="Chat"
                    component={ChatScreen}
                    options={() => ({
                        title: t('words.chat'),
                        header: () => <ChatHeader />,
                        tabBarBadge: hasUnseenMessages ? '' : undefined,
                    })}
                />
                <Tab.Screen
                    name="Settings"
                    component={Settings}
                    options={() => ({
                        title: t('words.settings'),
                        header: () => <SettingsHeader />,
                    })}
                />
            </Tab.Navigator>
        </>
    )
}

const styles = (theme: Theme, insets: EdgeInsets) =>
    StyleSheet.create({
        tabBar: {
            backgroundColor: theme.colors.secondary,
            height: theme.sizes.tabBarHeight + insets.bottom,
            borderTopWidth: 1,
            borderTopColor: theme.colors.extraLightGrey,
        },
        tabBarLabel: {
            fontFamily: 'AlbertSans-Bold',
            fontSize: 14,
        },
        tabBarIconContainer: {
            paddingBottom: theme.spacing.xs,
            marginTop: 'auto',
        },
        tabBarBadge: {
            backgroundColor: theme.colors.red,
            top: 8,
            left: 2,
            borderWidth: 2,
            borderColor: theme.colors.secondary,
            width: 12,
            height: 12,
            minWidth: 0,
            borderRadius: 6,
        },
        tabBarItem: {
            paddingBottom: theme.spacing.lg,
        },
        disabledIcon: {
            opacity: 0.2,
            backgroundColor: theme.colors.grey,
        },
        row: {
            flexDirection: 'row',
        },
    })

export default TabsNavigator
