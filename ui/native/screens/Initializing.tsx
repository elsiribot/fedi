import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React, { useEffect } from 'react'
import { ImageBackground, StyleSheet } from 'react-native'

import {
    authenticateChat,
    changeAuthenticatedGuardian,
    refreshFederations,
    setActiveFederationId,
    setAuthenticatedMember,
    setChatGroups,
    setChatMembersSeen,
    setChatMessages,
} from '@fedi/common/redux'

import { Images } from '../assets/images'
import { fedimint } from '../bridge'
import {
    ACTIVE_FEDERATION_ID_DB_KEY,
    AUTHENTICATED_GUARDIAN_DB_KEY,
    CHAT_GROUPS_PERSISTENCE_KEY,
    CHAT_MEMBERS_PERSISTENCE_KEY,
    CHAT_MESSAGES_PERSISTENCE_KEY,
    FEDERATION_USERNAME_ID_DB_KEY,
} from '../constants'
import {
    receiveGroups,
    receiveMembersSeen,
    receiveMessages,
    useChatContext,
} from '../state/contexts/ChatContext'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import { NavigationHook, RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'Initializing'>

const Initializing: React.FC<Props> = ({ route }: Props) => {
    const navigation = useNavigation<NavigationHook>()
    const { theme } = useTheme()
    const { reset } = route.params
    const {
        state: { connectionOptions },
        dispatch: chatDispatch,
    } = useChatContext()

    const dispatch = useAppDispatch()
    const { activeFederationId, federations } = useAppSelector(
        s => s.federation,
    )

    // after localstorage has been checked call refreshFederations
    // to get an updated list from the bridge
    useEffect(() => {
        const initializeFederations = async () => {
            const updatedFederations = await dispatch(
                refreshFederations(fedimint),
            ).unwrap()

            const savedUsernames = await AsyncStorage.getItem(
                `${FEDERATION_USERNAME_ID_DB_KEY}`,
            )
            if (savedUsernames) {
                console.info('saved usernames found... restoring')
                const usernameMap = JSON.parse(savedUsernames)

                // Store any usernames found for federations other than
                // the activeFederation so we can avoid triggering chat
                // authentication for all federations
                const inactiveFederations = updatedFederations.filter(
                    f => f.id !== activeFederationId,
                )
                inactiveFederations.map(async f => {
                    if (usernameMap[f.id]) {
                        console.info('username found for federation', f.id)
                        dispatch(
                            setAuthenticatedMember({
                                federationId: f.id,
                                authenticatedMember: {
                                    id: usernameMap[f.id],
                                    username: usernameMap[f.id],
                                },
                            }),
                        )
                    }
                })

                // For the active federation, trigger chat authentication
                // with the stored username
                if (usernameMap[activeFederationId!]) {
                    console.info(
                        'active federation',
                        activeFederationId,
                        'has a stored username... authenticating',
                    )
                    await dispatch(
                        authenticateChat({
                            fedimint,
                            federationId: activeFederationId!,
                            username: usernameMap[activeFederationId!],
                        }),
                    ).unwrap()
                    return navigation.replace('TabsNavigator')
                }
            }
            // If there are no stored usernames for the active federation
            // go to FederationWelcome to recover/create username
            // or go to Home if no chat is available
            if (connectionOptions) {
                navigation.replace('FederationWelcome')
            } else {
                navigation.replace('TabsNavigator')
            }
        }
        // activeFederationId should be null if there are 0 federations so
        // this should only ever be called once
        if (activeFederationId && federations.length === 0) {
            initializeFederations()
        }
    }, [
        dispatch,
        connectionOptions,
        activeFederationId,
        federations.length,
        navigation,
    ])

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

            const restoreMessages = async (key: string) => {
                try {
                    const storedJson = await AsyncStorage.getItem(key)

                    const savedChatMessages = storedJson
                        ? JSON.parse(storedJson)
                        : null

                    console.info('savedChatMessages', savedChatMessages)

                    if (savedChatMessages !== null) {
                        const { messages } = savedChatMessages
                        console.debug('recovering messages')
                        if (messages) {
                            const federationId = key.split(':')[1]
                            chatDispatch(receiveMessages(messages))
                            dispatch(
                                setChatMessages({
                                    federationId,
                                    messages,
                                }),
                            )
                        }
                    }
                } catch (error) {
                    console.error(error)
                }
            }

            const restoreGroups = async (key: string) => {
                try {
                    const storedJson = await AsyncStorage.getItem(key)

                    const savedChatGroups = storedJson
                        ? JSON.parse(storedJson)
                        : null

                    console.info('savedChatGroups', savedChatGroups)

                    if (savedChatGroups !== null) {
                        const { groups } = savedChatGroups
                        console.debug('recovering groups')
                        if (groups) {
                            const federationId = key.split(':')[1]
                            chatDispatch(receiveGroups(groups))
                            dispatch(
                                setChatGroups({
                                    federationId,
                                    groups,
                                }),
                            )
                        }
                    }
                } catch (error) {
                    console.error(error)
                }
            }

            const restoreMembers = async (key: string) => {
                try {
                    const storedJson = await AsyncStorage.getItem(key)

                    const savedChatMembers = storedJson
                        ? JSON.parse(storedJson)
                        : null

                    console.info('savedChatMembers', savedChatMembers)

                    if (savedChatMembers !== null) {
                        const { members } = savedChatMembers
                        console.debug('recovering members')
                        if (members) {
                            const federationId = key.split(':')[1]
                            chatDispatch(receiveMembersSeen(members))
                            dispatch(
                                setChatMembersSeen({
                                    federationId,
                                    membersSeen: members,
                                }),
                            )
                        }
                    }
                } catch (error) {
                    console.error(error)
                }
            }

            const restoreChatState = async () => {
                const storageKeys = await AsyncStorage.getAllKeys()

                // all chat keys should be in the format:
                // `AsyncStorage-ChatContext-${datatype}:${federationId}`
                storageKeys.forEach(k => {
                    if (k.startsWith(CHAT_MESSAGES_PERSISTENCE_KEY)) {
                        restoreMessages(k)
                    } else if (k.startsWith(CHAT_GROUPS_PERSISTENCE_KEY)) {
                        restoreGroups(k)
                    } else if (k.startsWith(CHAT_MEMBERS_PERSISTENCE_KEY)) {
                        restoreMembers(k)
                    }
                })
            }

            restoreChatState()
            restoreFederationsState()
        }

        if (!activeFederationId) {
            restoreState()
        }
    }, [navigation, reset, chatDispatch, dispatch, activeFederationId])

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
