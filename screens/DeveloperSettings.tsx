import AsyncStorage from '@react-native-async-storage/async-storage'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, CheckBox, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import RNFS from 'react-native-fs'
import Share from 'react-native-share'

import { LightningGateway } from '../bridge'
import {
    COMMUNITY_GROUPS_PERSISTENCE_KEY,
    COMMUNITY_MEMBERS_PERSISTENCE_KEY,
    COMMUNITY_MESSAGES_PERSISTENCE_KEY,
} from '../constants'
import {
    DEFAULT_GROUPS,
    receiveGroups,
    receiveMembersSeen,
    receiveMessages,
    useCommunityContext,
} from '../state/contexts/CommunityContext'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import {
    resetFederationCredentials,
    useFederationsContext,
} from '../state/contexts/FederationsContext'
import { useBridge, useXmpp } from '../state/hooks'
import { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'DeveloperSettings'
>

const DeveloperSettings: React.FC<Props> = () => {
    const { theme } = useTheme()
    const { i18n } = useTranslation()
    const { listGateways, switchGateway } = useBridge()
    const { dispatch: federationsDispatch } = useFederationsContext()
    const { dispatch: communityDispatch } = useCommunityContext()
    const { toast } = useEnvironmentContext().state
    const { sendTestXml } = useXmpp()
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [selectedLanguage, setSelectedLanguage] = useState<string>('en')
    const [gateways, setGateways] = useState<LightningGateway[]>([])

    useEffect(() => {
        const getGatewaysList = async () => {
            try {
                setIsLoading(true)
                // TODO: error handling
                const _gateways = await listGateways()
                setIsLoading(false)
                setGateways(_gateways)
            } catch (e) {
                toast?.show('Failed to fetch gateways')
            }
        }

        getGatewaysList()
    }, [toast, listGateways])

    const handleSelectGateway = async (gateway: LightningGateway) => {
        // TODO: error handling
        await switchGateway(gateway)
        const updatedGateways = gateways.map((gw: LightningGateway) => {
            gw.active = gateway.nodePubKey === gw.nodePubKey
            return gw
        })
        setGateways(updatedGateways)
    }

    const shareLogs = async () => {
        await Share.open({
            title: 'Fedi logs',
            // FIXME: this needs file:// prefix ... should do this with a util?
            url: `file://${RNFS.DocumentDirectoryPath}/fedi.log`,
        })
    }
    useEffect(() => {
        i18n.changeLanguage(selectedLanguage)
    }, [i18n, selectedLanguage])

    if (isLoading) return <ActivityIndicator />
    return (
        <View style={styles(theme).container}>
            <Text>Change your lightning gateway</Text>
            {gateways.map((gw: LightningGateway) => (
                <View>
                    <CheckBox
                        title={
                            <Text style={styles(theme).checkboxText}>
                                {gw.api}
                            </Text>
                        }
                        checked={gw.active}
                        onPress={() => handleSelectGateway(gw)}
                    />
                </View>
            ))}
            <Text>Change your language</Text>
            <View>
                <CheckBox
                    title={
                        <Text style={styles(theme).checkboxText}>
                            {'English'}
                        </Text>
                    }
                    checked={selectedLanguage === 'en'}
                    onPress={() => setSelectedLanguage('en')}
                />
                <CheckBox
                    title={
                        <Text style={styles(theme).checkboxText}>
                            {'Spanish'}
                        </Text>
                    }
                    checked={selectedLanguage === 'es'}
                    onPress={() => setSelectedLanguage('es')}
                />
            </View>
            <Button
                size="sm"
                title={'Delete all groups, messages, & members seen'}
                onPress={() => {
                    communityDispatch(receiveMembersSeen([]))
                    communityDispatch(receiveMessages([]))
                    communityDispatch(receiveGroups(DEFAULT_GROUPS))
                    AsyncStorage.setItem(
                        COMMUNITY_MEMBERS_PERSISTENCE_KEY,
                        JSON.stringify({ members: [] }),
                    )
                    AsyncStorage.setItem(
                        COMMUNITY_MESSAGES_PERSISTENCE_KEY,
                        JSON.stringify({ messages: [] }),
                    )
                    AsyncStorage.setItem(
                        COMMUNITY_GROUPS_PERSISTENCE_KEY,
                        JSON.stringify({ groups: DEFAULT_GROUPS }),
                    )
                }}
            />
            <Button
                size="sm"
                title={'Delete all groups'}
                onPress={() => {
                    communityDispatch(receiveGroups(DEFAULT_GROUPS))
                    AsyncStorage.setItem(
                        COMMUNITY_GROUPS_PERSISTENCE_KEY,
                        JSON.stringify({ groups: DEFAULT_GROUPS }),
                    )
                }}
            />
            <Button
                size="sm"
                title={'Delete all messages'}
                onPress={() => {
                    communityDispatch(receiveMessages([]))
                    AsyncStorage.setItem(
                        COMMUNITY_MESSAGES_PERSISTENCE_KEY,
                        JSON.stringify({ messages: [] }),
                    )
                }}
            />
            <Button
                size="sm"
                title={'Delete all members seen'}
                onPress={() => {
                    communityDispatch(receiveMembersSeen([]))
                    communityDispatch(receiveGroups(DEFAULT_GROUPS))
                    AsyncStorage.setItem(
                        COMMUNITY_MEMBERS_PERSISTENCE_KEY,
                        JSON.stringify({ members: [] }),
                    )
                }}
            />
            <Button
                size="sm"
                title="Reset username"
                onPress={() => {
                    federationsDispatch(resetFederationCredentials())
                }}
            />
            <Button
                size="sm"
                disabled
                title="Send XML"
                onPress={() => {
                    sendTestXml()
                }}
            />
            <Button
                size="sm"
                title="Share logs"
                onPress={() => {
                    shareLogs()
                }}
            />
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
        checkboxText: {
            paddingHorizontal: theme.spacing.md,
            textAlign: 'left',
        },
    })

export default DeveloperSettings
