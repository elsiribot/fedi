import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { ImageBackground, StyleSheet } from 'react-native'

import {
    authenticateChat,
    changeAuthenticatedGuardian,
    refreshFederations,
    selectAuthenticatedMember,
    setActiveFederationId,
} from '@fedi/common/redux'

import { Images } from '../assets/images'
import { fedimint } from '../bridge'
import {
    ACTIVE_FEDERATION_ID_DB_KEY,
    AUTHENTICATED_GUARDIAN_DB_KEY,
    CHAT_GROUPS_PERSISTENCE_KEY,
    CHAT_MEMBERS_PERSISTENCE_KEY,
    CHAT_MESSAGES_PERSISTENCE_KEY,
} from '../constants'
import {
    receiveGroups,
    receiveMembersSeen,
    receiveMessages,
    useChatContext,
} from '../state/contexts/ChatContext'
import { useAppDispatch, useAppSelector, useBridge } from '../state/hooks'
import { NavigationHook, RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'Initializing'>

const Initializing: React.FC<Props> = ({ route }: Props) => {
    const navigation = useNavigation<NavigationHook>()
    const { theme } = useTheme()
    const { reset } = route.params
    const [usernameRequired, setUsernameRequired] = useState<boolean>(true)
    const [usernameToRestore, setUsernameToRestore] = useState<string>('')
    const { dispatch: chatDispatch } = useChatContext()
    const { backupXmppUsername, getXmppCredentials } = useBridge()

    const dispatch = useAppDispatch()
    const { activeFederationId, federations } = useAppSelector(
        s => s.federation,
    )
    const authenticatedMember = useAppSelector(selectAuthenticatedMember)

    // restoreState changes usernameToRestore if it finds a username
    // in localstorage... makes sure we don't go to FederationWelcome
    useEffect(() => {
        if (usernameToRestore) {
            setUsernameRequired(false)
        }
    }, [usernameToRestore])

    // this effect restores XMPP credentials after saving the
    // username found in localstorage
    useEffect(() => {
        const restoreUsername = async () => {
            await dispatch(
                authenticateChat({
                    fedimint,
                    federationId: activeFederationId!,
                    username: usernameToRestore,
                }),
            )
        }
        // don't try to restore unless we find both activeFederationId
        // and username in localstorage
        if (activeFederationId && usernameToRestore) {
            restoreUsername()
            setUsernameToRestore('')
        }
    }, [activeFederationId, backupXmppUsername, dispatch, usernameToRestore])

    // after localstorage has been checked and listFederations has been called
    // go to FederationWelcome if a username still needs to be set
    useEffect(() => {
        if (
            activeFederationId &&
            usernameToRestore === '' &&
            usernameRequired === true
        ) {
            navigation.replace('FederationWelcome')
        }
    }, [navigation, activeFederationId, usernameToRestore, usernameRequired])

    // after localstorage has been checked call listFederations
    // to update the federations
    useEffect(() => {
        const storeFederations = async () => {
            await dispatch(refreshFederations(fedimint))
        }
        // activeFederationId should be null if there are 0 federations so
        // this should only ever be called once
        if (activeFederationId && federations.length === 0) {
            storeFederations()
        }
    }, [dispatch, activeFederationId, federations.length])

    // if federations have been stored and a username has been restored
    // navigate to TabsNavigator
    useEffect(() => {
        if (federations.length > 0 && authenticatedMember?.username) {
            navigation.replace('TabsNavigator')
        }
    }, [navigation, federations.length, authenticatedMember?.username])

    // this useEffect checks async storage to restore
    // federations state on a fresh app load
    useEffect(() => {
        const restoreState = async () => {
            const restoreFederationsState = async () => {
                try {
                    // load selected federation id from async storage
                    const saved = await AsyncStorage.getItem(
                        ACTIVE_FEDERATION_ID_DB_KEY,
                    )
                    const savedJson = saved ? JSON.parse(saved) : null

                    if (savedJson) {
                        // this logic must be reached to trigger any useEffects
                        const { activeFederation } = savedJson
                        console.log('saved federation', activeFederation)
                        if (activeFederation?.id) {
                            dispatch(
                                setActiveFederationId(activeFederation?.id),
                            )
                            if (activeFederation.username) {
                                setUsernameToRestore(activeFederation.username)
                            }
                            // load selected federation id from async storage
                            const savedGuardian = await AsyncStorage.getItem(
                                AUTHENTICATED_GUARDIAN_DB_KEY,
                            )
                            const savedGuardianJson = savedGuardian
                                ? JSON.parse(savedGuardian)
                                : null

                            if (savedGuardianJson) {
                                const { authenticatedGuardian } =
                                    savedGuardianJson
                                console.info(
                                    'restoring guardian',
                                    authenticatedGuardian?.name,
                                )
                                dispatch(
                                    changeAuthenticatedGuardian(
                                        authenticatedGuardian,
                                    ),
                                )
                            }
                        }
                    } else {
                        // if there is nothing in localstorage go to Splash
                        return navigation.replace('Splash')
                    }
                } catch (error) {
                    console.error(error)
                    return navigation.replace('Splash')
                }
            }

            const restoreMessages = async () => {
                try {
                    const savedChatMessagesJson = await AsyncStorage.getItem(
                        CHAT_MESSAGES_PERSISTENCE_KEY,
                    )

                    const savedChatMessages = savedChatMessagesJson
                        ? JSON.parse(savedChatMessagesJson)
                        : null

                    console.info('savedChatMessages', savedChatMessages)

                    if (savedChatMessages !== null) {
                        const { messages } = savedChatMessages

                        console.debug('recovering messages')

                        if (messages) {
                            chatDispatch(receiveMessages(messages))
                        }
                    }
                } catch (error) {
                    console.error(error)
                }
            }

            const restoreGroups = async () => {
                try {
                    const savedChatGroupsJson = await AsyncStorage.getItem(
                        CHAT_GROUPS_PERSISTENCE_KEY,
                    )

                    const savedChatGroups = savedChatGroupsJson
                        ? JSON.parse(savedChatGroupsJson)
                        : null

                    console.info('savedChatGroups', savedChatGroups)

                    if (savedChatGroups !== null) {
                        const { groups } = savedChatGroups

                        console.debug('recovering groups')

                        if (groups) {
                            chatDispatch(receiveGroups(groups))
                        }
                    }
                } catch (error) {
                    console.error(error)
                }
            }

            const restoreMembers = async () => {
                try {
                    const savedChatMembersJson = await AsyncStorage.getItem(
                        CHAT_MEMBERS_PERSISTENCE_KEY,
                    )

                    const savedChatMembers = savedChatMembersJson
                        ? JSON.parse(savedChatMembersJson)
                        : null

                    console.info('savedChatMembers', savedChatMembers)

                    if (savedChatMembers !== null) {
                        const { members } = savedChatMembers

                        console.debug('recovering members')

                        if (members) {
                            chatDispatch(receiveMembersSeen(members))
                        }
                    }
                } catch (error) {
                    console.error(error)
                }
            }

            const restoreChatState = async () => {
                restoreMessages()
                restoreGroups()
                restoreMembers()
            }

            restoreChatState()
            restoreFederationsState()
        }

        if (!activeFederationId) {
            restoreState()
        }
    }, [
        chatDispatch,
        getXmppCredentials,
        navigation,
        reset,
        dispatch,
        activeFederationId,
    ])

    return (
        <ImageBackground
            resizeMode="cover"
            style={styles(theme).imageBackground}
            source={Images.HoloBackground}
        />
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        imageBackground: {
            ...theme.styles.h100w100,
            justifyContent: 'space-evenly',
        },
    })

export default Initializing
