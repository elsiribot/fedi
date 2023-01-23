import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React, { useEffect } from 'react'
import { ImageBackground, StyleSheet } from 'react-native'

import { Images } from '../assets/images'
import { listFederations } from '../bridge'
import {
    COMMUNITY_MEMBERS_PERSISTENCE_KEY,
    COMMUNITY_MESSAGES_PERSISTENCE_KEY,
    COMMUNITY_ROOMS_PERSISTENCE_KEY,
    SELECTED_FEDERATION_ID_DB_KEY,
} from '../constants'
import {
    receiveMembersSeen,
    receiveMessages,
    receiveRooms,
    useCommunityContext,
} from '../state/contexts/CommunityContext'
import {
    resetFederationsState,
    updateFederations,
    updateFederationUsername,
    useFederationsContext,
} from '../state/contexts/FederationsContext'
import { NavigationHook, RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'Initializing'>

const Initializing: React.FC<Props> = ({ route }: Props) => {
    const navigation = useNavigation<NavigationHook>()
    const { theme } = useTheme()
    const { reset } = route.params
    const { dispatch: federationsDispatch } = useFederationsContext()
    const { dispatch: communityDispatch } = useCommunityContext()

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

                    const { selectedFederation } = savedJson

                    // load federations from bridge
                    let federations = await listFederations()
                    if (selectedFederation?.id) {
                        federationsDispatch(
                            updateFederations(
                                selectedFederation?.id,
                                federations,
                            ),
                        )
                        if (selectedFederation.username) {
                            federationsDispatch(
                                updateFederationUsername(
                                    selectedFederation.username,
                                ),
                            )
                        }
                    }
                    return navigation.replace(
                        federations.length > 0 ? 'Home' : 'Splash',
                    )
                } catch (error) {
                    console.error(error)
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

                        console.log('recovering messages')

                        if (messages) {
                            communityDispatch(receiveMessages(messages))
                        }
                    }
                } catch (error) {
                    console.error(error)
                }
            }

            const restoreRooms = async () => {
                try {
                    const savedCommunityRoomsJson = await AsyncStorage.getItem(
                        COMMUNITY_ROOMS_PERSISTENCE_KEY,
                    )

                    const savedCommunityRooms = savedCommunityRoomsJson
                        ? JSON.parse(savedCommunityRoomsJson)
                        : null

                    console.info('savedCommunityRooms', savedCommunityRooms)

                    if (savedCommunityRooms !== null) {
                        const { rooms } = savedCommunityRooms

                        console.log('recovering rooms')

                        if (rooms) {
                            communityDispatch(receiveRooms(rooms))
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

                        console.log('recovering members')

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
                restoreRooms()
                restoreMembers()
            }

            restoreCommunityState()
            restoreFederationsState()
        }

        if (reset === true) {
            federationsDispatch(resetFederationsState())
            navigation.navigate('Splash')
        } else {
            restoreState()
        }
    }, [communityDispatch, federationsDispatch, navigation, reset])

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
