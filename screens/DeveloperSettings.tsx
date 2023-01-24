import AsyncStorage from '@react-native-async-storage/async-storage'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, CheckBox, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { LightningGateway } from '../bridge'
import {
    COMMUNITY_MEMBERS_PERSISTENCE_KEY,
    COMMUNITY_MESSAGES_PERSISTENCE_KEY,
    COMMUNITY_ROOMS_PERSISTENCE_KEY,
} from '../constants'
import {
    DEFAULT_ROOMS,
    receiveMembersSeen,
    receiveMessages,
    receiveRooms,
    useCommunityContext,
} from '../state/contexts/CommunityContext'
import {
    resetFederationUsername,
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
    const { sendTestXml } = useXmpp()
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [selectedLanguage, setSelectedLanguage] = useState<string>('en')
    const [gateways, setGateways] = useState<LightningGateway[]>([])

    useEffect(() => {
        const getGatewaysList = async () => {
            setIsLoading(true)
            const _gateways = await listGateways()
            setIsLoading(false)
            setGateways(_gateways)
        }

        getGatewaysList()
    }, [listGateways])

    const handleSelectGateway = async (gateway: LightningGateway) => {
        await switchGateway(gateway)
        const updatedGateways = gateways.map((gw: LightningGateway) => {
            gw.active = gateway.nodePubKey === gw.nodePubKey
            return gw
        })
        setGateways(updatedGateways)
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
                title={'Delete all rooms, messages, & members'}
                onPress={() => {
                    communityDispatch(receiveMembersSeen([]))
                    communityDispatch(receiveMessages([]))
                    communityDispatch(receiveRooms(DEFAULT_ROOMS))
                    AsyncStorage.setItem(
                        COMMUNITY_MEMBERS_PERSISTENCE_KEY,
                        JSON.stringify({ members: [] }),
                    )
                    AsyncStorage.setItem(
                        COMMUNITY_MESSAGES_PERSISTENCE_KEY,
                        JSON.stringify({ messages: [] }),
                    )
                    AsyncStorage.setItem(
                        COMMUNITY_ROOMS_PERSISTENCE_KEY,
                        JSON.stringify({ rooms: DEFAULT_ROOMS }),
                    )
                }}
            />
            <Button
                size="sm"
                title="Reset username"
                onPress={() => {
                    federationsDispatch(resetFederationUsername())
                }}
            />
            <Button
                size="sm"
                title="Send XML"
                onPress={() => {
                    sendTestXml()
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
