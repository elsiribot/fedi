import AsyncStorage from '@react-native-async-storage/async-storage'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Input, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native'
import RNFS from 'react-native-fs'
import Share from 'react-native-share'

import { changeSelectedFiatCurrency } from '@fedi/common/redux/currency'
import {
    Guardian,
    LightningGateway,
    SupportedCurrency,
} from '@fedi/common/types'

import CheckBox from '../components/ui/CheckBox'
import SvgImage from '../components/ui/SvgImage'
import {
    AUTHENTICATED_GUARDIAN_DB_KEY,
    CHAT_GROUPS_PERSISTENCE_KEY,
    CHAT_MEMBERS_PERSISTENCE_KEY,
    CHAT_MESSAGES_PERSISTENCE_KEY,
} from '../constants'
import {
    DEFAULT_GROUPS,
    receiveGroups,
    receiveMembersSeen,
    receiveMessages,
    useChatContext,
} from '../state/contexts/ChatContext'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import {
    changeAuthenticatedGuardian,
    resetFederationCredentials,
    useFederationsContext,
} from '../state/contexts/FederationsContext'
import { useAppDispatch, useAppSelector, useBridge } from '../state/hooks'
import { useXmpp } from '../state/hooks/chat'
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
    const { dispatch: chatDispatch } = useChatContext()
    const { toast } = useEnvironmentContext().state
    const { sendTestXml } = useXmpp()
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [selectedLanguage, setSelectedLanguage] = useState<string>('en')
    const [gateways, setGateways] = useState<LightningGateway[]>([])
    const [guardianIndex] = useState<number>(0)
    const reduxDispatch = useAppDispatch()
    const selectedFiatCurrency = useAppSelector(
        s => s.currency.selectedFiatCurrency,
    )

    const { authenticatedGuardian, selectedFederation } = state

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
                <CheckBox
                    title={
                        <Text style={styles(theme).checkboxText}>
                            {'French'}
                        </Text>
                    }
                    checked={selectedLanguage === 'fr'}
                    onPress={() => setSelectedLanguage('fr')}
                />
            </View>
            <Text>Change your currency</Text>
            <View>
                <CheckBox
                    title={
                        <Text style={styles(theme).checkboxText}>{'USD'}</Text>
                    }
                    checked={selectedFiatCurrency === SupportedCurrency.USD}
                    onPress={() =>
                        reduxDispatch(
                            changeSelectedFiatCurrency(SupportedCurrency.USD),
                        )
                    }
                />
                <CheckBox
                    title={
                        <Text style={styles(theme).checkboxText}>{'EUR'}</Text>
                    }
                    checked={selectedFiatCurrency === SupportedCurrency.EUR}
                    onPress={() =>
                        reduxDispatch(
                            changeSelectedFiatCurrency(SupportedCurrency.EUR),
                        )
                    }
                />
                <CheckBox
                    title={
                        <Text style={styles(theme).checkboxText}>{'CFA'}</Text>
                    }
                    checked={selectedFiatCurrency === SupportedCurrency.CFA}
                    onPress={() =>
                        reduxDispatch(
                            changeSelectedFiatCurrency(SupportedCurrency.CFA),
                        )
                    }
                />
            </View>
            <Button
                size="sm"
                title={'Delete all groups, messages, & members seen'}
                onPress={() => {
                    chatDispatch(receiveMembersSeen([]))
                    chatDispatch(receiveMessages([]))
                    chatDispatch(receiveGroups(DEFAULT_GROUPS))
                    AsyncStorage.setItem(
                        CHAT_MEMBERS_PERSISTENCE_KEY,
                        JSON.stringify({ members: [] }),
                    )
                    AsyncStorage.setItem(
                        CHAT_MESSAGES_PERSISTENCE_KEY,
                        JSON.stringify({ messages: [] }),
                    )
                    AsyncStorage.setItem(
                        CHAT_GROUPS_PERSISTENCE_KEY,
                        JSON.stringify({ groups: DEFAULT_GROUPS }),
                    )
                }}
            />
            <Button
                size="sm"
                title={'Delete all groups'}
                onPress={() => {
                    chatDispatch(receiveGroups(DEFAULT_GROUPS))
                    AsyncStorage.setItem(
                        CHAT_GROUPS_PERSISTENCE_KEY,
                        JSON.stringify({ groups: DEFAULT_GROUPS }),
                    )
                }}
            />
            <Button
                size="sm"
                title={'Delete all messages'}
                onPress={() => {
                    chatDispatch(receiveMessages([]))
                    AsyncStorage.setItem(
                        CHAT_MESSAGES_PERSISTENCE_KEY,
                        JSON.stringify({ messages: [] }),
                    )
                }}
            />
            <Button
                size="sm"
                title={'Delete all members seen'}
                onPress={() => {
                    chatDispatch(receiveMembersSeen([]))
                    chatDispatch(receiveGroups(DEFAULT_GROUPS))
                    AsyncStorage.setItem(
                        CHAT_MEMBERS_PERSISTENCE_KEY,
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
                                    authenticatedGuardian == null
                                        ? theme.colors.primary
                                        : theme.colors.red,
                            }}>
                            {authenticatedGuardian == null ? 'None' : 'Reset'}
                        </Text>
                    }
                    checked={authenticatedGuardian == null}
                    checkedIcon={<SvgImage name="CheckboxUnchecked" />}
                    uncheckedIcon={<SvgImage name="CheckboxUnchecked" />}
                    checkedColor={theme.colors.lightGrey}
                    uncheckedColor={theme.colors.red}
                    onPress={() => {
                        federationsDispatch(changeAuthenticatedGuardian(null))
                        AsyncStorage.removeItem(AUTHENTICATED_GUARDIAN_DB_KEY)
                    }}
                />
                {selectedFederation?.nodes.map((n, i) => {
                    const guardian: Guardian = {
                        ...n,
                        peerId: i,
                        password: `${i + 1}${i + 1}${i + 1}${i + 1}`,
                    }
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
                {authenticatedGuardian && (
                    <View style={styles(theme).passwordContainer}>
                        <Text small>{'Confirm guardian password'}</Text>
                        <Input
                            onChangeText={input => {
                                federationsDispatch(
                                    changeAuthenticatedGuardian({
                                        ...authenticatedGuardian,
                                        password: input,
                                    }),
                                )
                            }}
                            value={authenticatedGuardian.password}
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
