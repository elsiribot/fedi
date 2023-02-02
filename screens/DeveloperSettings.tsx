import AsyncStorage from '@react-native-async-storage/async-storage'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, CheckBox, Input, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native'
import RNFS from 'react-native-fs'
import Share from 'react-native-share'

import { Guardian, LightningGateway } from '../bridge'
import {
    AUTHENTICATED_GUARDIAN_DB_KEY,
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
    changeAuthenticatedGuardian,
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
    const { state, dispatch: federationsDispatch } = useFederationsContext()
    const { dispatch: communityDispatch } = useCommunityContext()
    const { toast } = useEnvironmentContext().state
    const { sendTestXml } = useXmpp()
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [selectedLanguage, setSelectedLanguage] = useState<string>('en')
    const [gateways, setGateways] = useState<LightningGateway[]>([])
    const [guardianIndex, setGuardianIndex] = useState<number>(0)
    const [guardianPassword, setGuardianPassword] = useState<string>('')

    useEffect(() => {
        const getGatewaysList = async () => {
            try {
                setIsLoading(true)
                const _gateways = await listGateways()
                setIsLoading(false)
                setGateways(_gateways)
            } catch (e) {
                toast?.show('Failed to fetch gateways', 3000)
            }
        }

        getGatewaysList()
    }, [toast, listGateways])

    const handleSelectGateway = async (gateway: LightningGateway) => {
        try {
            await switchGateway(gateway)
        } catch (e) {
            toast?.show('Failed to switch gateway', 3000)
        }
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

    useEffect(() => {}, [guardianIndex])

    if (isLoading) return <ActivityIndicator />
    return (
        <ScrollView contentContainerStyle={styles(theme).container}>
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
            <View style={styles(theme).guardians}>
                <Text>{'Select a node to simulate Guardian Mode'}</Text>
                <CheckBox
                    title={
                        <Text
                            caption
                            style={{
                                color:
                                    state.authenticatedGuardian == null
                                        ? theme.colors.primary
                                        : theme.colors.red,
                            }}>
                            {state.authenticatedGuardian == null
                                ? 'None'
                                : 'Reset'}
                        </Text>
                    }
                    checked={state.authenticatedGuardian == null}
                    checkedIcon="circle"
                    uncheckedIcon="circle"
                    checkedColor={theme.colors.lightGrey}
                    uncheckedColor={theme.colors.red}
                    onPress={() => {
                        federationsDispatch(changeAuthenticatedGuardian(null))
                        AsyncStorage.removeItem(AUTHENTICATED_GUARDIAN_DB_KEY)
                    }}
                />
                {state.selectedFederation?.nodes.map((n, i) => {
                    const guardian = new Guardian({
                        ...n,
                        peerId: i,
                        password: 'aaaa',
                    })
                    return (
                        <CheckBox
                            title={<Text caption>{guardian.name}</Text>}
                            checked={
                                state.authenticatedGuardian?.name ===
                                guardian.name
                            }
                            onPress={() => {
                                federationsDispatch(
                                    changeAuthenticatedGuardian(guardian),
                                )
                            }}
                        />
                    )
                })}
                {state.authenticatedGuardian && (
                    <View style={styles(theme).passwordContainer}>
                        <Text small>{'Confirm guardian password'}</Text>
                        <Input
                            onChangeText={input => {
                                federationsDispatch(
                                    changeAuthenticatedGuardian(
                                        new Guardian({
                                            ...state.authenticatedGuardian,
                                            password: input,
                                        }),
                                    ),
                                )
                            }}
                            value={state.authenticatedGuardian?.password}
                            returnKeyType="done"
                            // containerStyle={styles(theme).textInputOuter}
                            // inputContainerStyle={styles(theme).textInputInner}
                            autoCapitalize={'none'}
                            autoCorrect={false}
                        />
                    </View>
                )}
            </View>
        </ScrollView>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing.xl,
        },
        checkboxText: {
            paddingHorizontal: theme.spacing.md,
            textAlign: 'left',
        },
        guardians: {
            paddingTop: theme.spacing.lg,
            flexDirection: 'row',
            flexWrap: 'wrap',
        },
        passwordContainer: {
            flexDirection: 'column',
            width: '100%',
        },
    })

export default DeveloperSettings
