import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { ImageBackground, StyleSheet } from 'react-native'

import { Images } from '../assets/images'
import { listFederations } from '../bridge'
import {
    COMMUNITY_GROUPS_PERSISTENCE_KEY,
    COMMUNITY_MEMBERS_PERSISTENCE_KEY,
    COMMUNITY_MESSAGES_PERSISTENCE_KEY,
    SELECTED_FEDERATION_ID_DB_KEY,
} from '../constants'
import {
    receiveGroups,
    receiveMembersSeen,
    receiveMessages,
    useCommunityContext,
} from '../state/contexts/CommunityContext'
import {
    updateFederationCredentials,
    updateFederations,
    updateSelectedFederationId,
    useFederationsContext,
} from '../state/contexts/FederationsContext'
import { useBridge } from '../state/hooks'
import { NavigationHook, RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'Initializing'>

const Initializing: React.FC<Props> = ({ route }: Props) => {
    const navigation = useNavigation<NavigationHook>()
    const { theme } = useTheme()
    const { reset } = route.params
    const [usernameRequired, setUsernameRequired] = useState<boolean>(true)
    const [usernameToRestore, setUsernameToRestore] = useState<string>('')
    const { state, dispatch: federationsDispatch } = useFederationsContext()
    const { dispatch: communityDispatch } = useCommunityContext()
    const { backupXmppUsername, getXmppCredentials } = useBridge()

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
            const credentials = await getXmppCredentials()
            const { password } = credentials
            federationsDispatch(
                updateFederationCredentials(usernameToRestore, password),
            )
            backupXmppUsername(usernameToRestore)
        }
        // don't try to restore unless we find both selectedFederationId
        // and username in localstorage
        if (state.selectedFederationId && usernameToRestore) {
            restoreUsername()
            setUsernameToRestore('')
        }
    }, [
        backupXmppUsername,
        federationsDispatch,
        getXmppCredentials,
        state.selectedFederation,
        state.selectedFederationId,
        usernameToRestore,
    ])

    // after localstorage has been checked and listFederations has been called
    // go to FederationWelcome if a username still needs to be set
    useEffect(() => {
        if (
            state.selectedFederation &&
            usernameToRestore === '' &&
            usernameRequired === true
        ) {
            navigation.replace('FederationWelcome')
        }
    }, [
        navigation,
        state.selectedFederation,
        usernameToRestore,
        usernameRequired,
    ])

    // after localstorage has been checked call listFederations
    // to update the federations
    useEffect(() => {
        const storeFederations = async () => {
            let federations = await listFederations()
            federationsDispatch(
                updateFederations(state.selectedFederationId, federations),
            )
        }
        // selectedFederationId should be null if there are 0 federations so
        // this should only ever be called once
        if (state.selectedFederationId && state.federations.length === 0) {
            storeFederations()
        }
    }, [
        federationsDispatch,
        state.selectedFederationId,
        state.federations.length,
    ])

    // if federations have been stored and a username has been restored
    // navigate to Home
    useEffect(() => {
        if (
            state.federations.length > 0 &&
            state.selectedFederation?.username
        ) {
            navigation.replace('Home')
        }
    }, [
        navigation,
        state.federations.length,
        state.selectedFederation?.username,
    ])

    // this useEffect checks async storage to restore
    // federations state on a fresh app load
    useEffect(() => {
        const restoreState = async () => {
            const restoreFederationsState = async () => {
                try {
                    // load selected federation id from async storage
                    const saved = await AsyncStorage.getItem(
                        SELECTED_FEDERATION_ID_DB_KEY,
                    )
                    const savedJson = saved ? JSON.parse(saved) : null

                    if (savedJson.selectedFederation?.name != null) {
                        // this logic must be reached to trigger any useEffects
                        const { selectedFederation } = savedJson
                        if (selectedFederation?.name) {
                            federationsDispatch(
                                updateSelectedFederationId(
                                    selectedFederation.name,
                                ),
                            )
                            if (selectedFederation.username) {
                                setUsernameToRestore(
                                    selectedFederation.username,
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
                    const savedCommunityMessagesJson =
                        await AsyncStorage.getItem(
                            COMMUNITY_MESSAGES_PERSISTENCE_KEY,
                        )

                    const savedCommunityMessages = savedCommunityMessagesJson
                        ? JSON.parse(savedCommunityMessagesJson)
                        : null

                    console.info(
                        'savedCommunityMessages',
                        savedCommunityMessages,
                    )

                    if (savedCommunityMessages !== null) {
                        const { messages } = savedCommunityMessages

                        console.debug('recovering messages')

                        if (messages) {
                            communityDispatch(receiveMessages(messages))
                        }
                    }
                } catch (error) {
                    console.error(error)
                }
            }

            const restoreGroups = async () => {
                try {
                    const savedCommunityGroupsJson = await AsyncStorage.getItem(
                        COMMUNITY_GROUPS_PERSISTENCE_KEY,
                    )

                    const savedCommunityGroups = savedCommunityGroupsJson
                        ? JSON.parse(savedCommunityGroupsJson)
                        : null

                    console.info('savedCommunityGroups', savedCommunityGroups)

                    if (savedCommunityGroups !== null) {
                        const { groups } = savedCommunityGroups

                        console.debug('recovering groups')

                        if (groups) {
                            communityDispatch(receiveGroups(groups))
                        }
                    }
                } catch (error) {
                    console.error(error)
                }
            }

            const restoreMembers = async () => {
                try {
                    const savedCommunityMembersJson =
                        await AsyncStorage.getItem(
                            COMMUNITY_MEMBERS_PERSISTENCE_KEY,
                        )

                    const savedCommunityMembers = savedCommunityMembersJson
                        ? JSON.parse(savedCommunityMembersJson)
                        : null

                    console.info('savedCommunityMembers', savedCommunityMembers)

                    if (savedCommunityMembers !== null) {
                        const { members } = savedCommunityMembers

                        console.debug('recovering members')

                        if (members) {
                            communityDispatch(receiveMembersSeen(members))
                        }
                    }
                } catch (error) {
                    console.error(error)
                }
            }

            const restoreCommunityState = async () => {
                restoreMessages()
                restoreGroups()
                restoreMembers()
            }

            restoreCommunityState()
            restoreFederationsState()
        }

        if (!state.selectedFederationId) {
            restoreState()
        }
    }, [
        communityDispatch,
        getXmppCredentials,
        federationsDispatch,
        navigation,
        reset,
        state.selectedFederationId,
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
