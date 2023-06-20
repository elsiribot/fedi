import AsyncStorage from '@react-native-async-storage/async-storage'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Input, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native'
import RNFS from 'react-native-fs'
import Share from 'react-native-share'

import {
    changeAuthenticatedGuardian,
    removeCustomFediMod,
    resetAuthenticatedMember,
    resetFederationChatState,
    selectActiveFederation,
    selectFederationCustomFediMods,
    setChatGroups,
    setChatMembersSeen,
    setChatMessages,
} from '@fedi/common/redux'
import {
    changeSelectedFiatCurrency,
    selectCurrency,
} from '@fedi/common/redux/currency'
import {
    Guardian,
    LightningGateway,
    SupportedCurrency,
} from '@fedi/common/types'

import { AddCustomFediModDialog } from '../components/feature/developer-settings/AddCustomFediModDialog'
import CheckBox from '../components/ui/CheckBox'
import SvgImage from '../components/ui/SvgImage'
import {
    AUTHENTICATED_GUARDIAN_DB_KEY,
    CHAT_GROUPS_PERSISTENCE_KEY,
    CHAT_MEMBERS_PERSISTENCE_KEY,
    CHAT_MESSAGES_PERSISTENCE_KEY,
} from '../constants'
import { version } from '../package.json'
import {
    receiveGroups,
    receiveMembersSeen,
    receiveMessages,
    useChatContext,
} from '../state/contexts/ChatContext'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppDispatch, useAppSelector, useBridge } from '../state/hooks'
import { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'DeveloperSettings'
>

const DeveloperSettings: React.FC<Props> = () => {
    const { theme } = useTheme()
    const { i18n } = useTranslation()
    const { listGateways, switchGateway } = useBridge()
    const { toast } = useEnvironmentContext().state
    const { dispatch: chatContextDispatch } = useChatContext()
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [selectedLanguage, setSelectedLanguage] = useState<string>(
        i18n.language,
    )
    const [gateways, setGateways] = useState<LightningGateway[]>([])
    const [isAddingCustomFediMod, setIsAddingCustomFediMod] =
        useState<boolean>(false)
    const selectedFiatCurrency = useAppSelector(selectCurrency)
    const customFediMods = useAppSelector(selectFederationCustomFediMods)

    // This is a partial refactor of state management from context to redux
    const reduxDispatch = useAppDispatch()
    const activeFederation = useAppSelector(selectActiveFederation)
    const authenticatedGuardian = useAppSelector(
        s => s.federation.authenticatedGuardian,
    )

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
            await switchGateway(gateway.nodePubKey)
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

    const removeFediMod = (siteId: string) => {
        if (!activeFederation) return
        reduxDispatch(
            removeCustomFediMod({ federationId: activeFederation.id, siteId }),
        )
        toast?.show('Custom site removed', 3000)
    }

    useEffect(() => {
        i18n.changeLanguage(selectedLanguage)
    }, [i18n, selectedLanguage])

    if (isLoading) return <ActivityIndicator />
    return (
        <ScrollView contentContainerStyle={styles(theme).container}>
            <SettingsSection title="App info">
                <Text
                    style={styles(theme).version}>{`Version ${version}`}</Text>
                <Button
                    title="Share logs"
                    containerStyle={styles(theme).buttonContainer}
                    onPress={() => {
                        shareLogs()
                    }}
                />
            </SettingsSection>
            <SettingsSection title="Custom sites">
                {customFediMods.map(fediMod => (
                    <View key={fediMod.id} style={styles(theme).fediMod}>
                        <View>
                            <Text>{fediMod.title}</Text>
                            <Text small>{fediMod.url}</Text>
                        </View>
                        <Pressable onPress={() => removeFediMod(fediMod.id)}>
                            <SvgImage name="Close" />
                        </Pressable>
                    </View>
                ))}
                <Button
                    title={'Add custom site'}
                    containerStyle={styles(theme).buttonContainer}
                    onPress={() => setIsAddingCustomFediMod(true)}
                />
                <AddCustomFediModDialog
                    isVisible={isAddingCustomFediMod}
                    onClose={() => setIsAddingCustomFediMod(false)}
                />
            </SettingsSection>
            <SettingsSection title="Change your language">
                <CheckBox
                    title={
                        <Text style={styles(theme).checkboxText}>
                            {'English'}
                        </Text>
                    }
                    checked={selectedLanguage === 'en'}
                    onPress={() => setSelectedLanguage('en')}
                    containerStyle={styles(theme).checkboxContainer}
                />
                <CheckBox
                    title={
                        <Text style={styles(theme).checkboxText}>
                            {'Spanish'}
                        </Text>
                    }
                    checked={selectedLanguage === 'es'}
                    onPress={() => setSelectedLanguage('es')}
                    containerStyle={styles(theme).checkboxContainer}
                />
                <CheckBox
                    title={
                        <Text style={styles(theme).checkboxText}>
                            {'French'}
                        </Text>
                    }
                    checked={selectedLanguage === 'fr'}
                    onPress={() => setSelectedLanguage('fr')}
                    containerStyle={styles(theme).checkboxContainer}
                />
            </SettingsSection>
            <SettingsSection title="Change your currency">
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
                    containerStyle={styles(theme).checkboxContainer}
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
                    containerStyle={styles(theme).checkboxContainer}
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
                    containerStyle={styles(theme).checkboxContainer}
                />
            </SettingsSection>
            <SettingsSection title="Change your lightning gateway">
                {gateways.map((gw: LightningGateway, index: number) => (
                    <View key={gw.nodePubKey}>
                        <CheckBox
                            key={index}
                            title={
                                <Text
                                    style={styles(theme).checkboxText}
                                    numberOfLines={1}>
                                    {gw.api}
                                </Text>
                            }
                            checked={gw.active}
                            onPress={() => handleSelectGateway(gw)}
                            containerStyle={styles(theme).checkboxContainer}
                        />
                    </View>
                ))}
            </SettingsSection>
            <SettingsSection title="Select a node to simulate Guardian Mode">
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
                    checked={!authenticatedGuardian}
                    onPress={() => {
                        reduxDispatch(changeAuthenticatedGuardian(null))
                        AsyncStorage.removeItem(AUTHENTICATED_GUARDIAN_DB_KEY)
                    }}
                    containerStyle={styles(theme).checkboxContainer}
                />
                {activeFederation &&
                    Object.entries(activeFederation.nodes).map(entry => {
                        const [index, node] = entry
                        const id = Number(index)
                        const guardian: Guardian = {
                            ...node,
                            peerId: id,
                            password: `${id + 1}${id + 1}${id + 1}${id + 1}`,
                        }
                        return (
                            <CheckBox
                                key={id}
                                title={<Text caption>{guardian.name}</Text>}
                                checked={
                                    authenticatedGuardian?.name ===
                                    guardian.name
                                }
                                onPress={() => {
                                    reduxDispatch(
                                        changeAuthenticatedGuardian(guardian),
                                    )
                                }}
                                containerStyle={styles(theme).checkboxContainer}
                            />
                        )
                    })}
                {authenticatedGuardian && (
                    <View style={styles(theme).passwordContainer}>
                        <Text small>{'Confirm guardian password'}</Text>
                        <Input
                            onChangeText={input => {
                                reduxDispatch(
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
            </SettingsSection>
            <SettingsSection title="Danger zone">
                <Button
                    title={'Delete all groups, messages, & members seen'}
                    containerStyle={styles(theme).buttonContainer}
                    onPress={() => {
                        if (activeFederation) {
                            reduxDispatch(
                                resetFederationChatState({
                                    federationId: activeFederation.id,
                                }),
                            )
                            AsyncStorage.setItem(
                                `${CHAT_GROUPS_PERSISTENCE_KEY}:${activeFederation.id}`,
                                JSON.stringify({ groups: [] }),
                            )
                            AsyncStorage.setItem(
                                `${CHAT_MEMBERS_PERSISTENCE_KEY}:${activeFederation.id}`,
                                JSON.stringify({ members: [] }),
                            )
                            AsyncStorage.setItem(
                                `${CHAT_MESSAGES_PERSISTENCE_KEY}:${activeFederation.id}`,
                                JSON.stringify({ messages: [] }),
                            )
                        }
                    }}
                />
                <Button
                    title={'Delete all groups'}
                    containerStyle={styles(theme).buttonContainer}
                    onPress={() => {
                        if (activeFederation) {
                            chatContextDispatch(receiveGroups([]))
                            reduxDispatch(
                                setChatGroups({
                                    federationId: activeFederation.id,
                                    groups: [],
                                }),
                            )
                            AsyncStorage.setItem(
                                `${CHAT_GROUPS_PERSISTENCE_KEY}:${activeFederation.id}`,
                                JSON.stringify({ groups: [] }),
                            )
                        }
                    }}
                />
                <Button
                    title={'Delete all messages'}
                    containerStyle={styles(theme).buttonContainer}
                    onPress={() => {
                        if (activeFederation) {
                            chatContextDispatch(receiveMessages([]))
                            reduxDispatch(
                                setChatMessages({
                                    federationId: activeFederation.id,
                                    messages: [],
                                }),
                            )
                            AsyncStorage.setItem(
                                `${CHAT_MESSAGES_PERSISTENCE_KEY}:${activeFederation.id}`,
                                JSON.stringify({ messages: [] }),
                            )
                        }
                    }}
                />
                <Button
                    title={'Delete all members seen'}
                    containerStyle={styles(theme).buttonContainer}
                    onPress={() => {
                        if (activeFederation) {
                            chatContextDispatch(receiveMembersSeen([]))
                            reduxDispatch(
                                setChatMembersSeen({
                                    federationId: activeFederation.id,
                                    membersSeen: [],
                                }),
                            )
                            AsyncStorage.setItem(
                                `${CHAT_MEMBERS_PERSISTENCE_KEY}:${activeFederation.id}`,
                                JSON.stringify({ members: [] }),
                            )
                        }
                    }}
                />
                <Button
                    title="Reset username"
                    containerStyle={styles(theme).buttonContainer}
                    onPress={() => {
                        reduxDispatch(
                            resetAuthenticatedMember({
                                federationId: activeFederation?.id!,
                            }),
                        )
                    }}
                />
            </SettingsSection>
        </ScrollView>
    )
}

const SettingsSection: React.FC<{
    title: React.ReactNode
    children: React.ReactNode
}> = ({ title, children }) => {
    const { theme } = useTheme()
    return (
        <View style={styles(theme).section}>
            <Text caption style={styles(theme).sectionTitle}>
                {title}
            </Text>
            <View>{children}</View>
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            padding: theme.spacing.xl,
        },
        section: {
            paddingBottom: theme.spacing.lg,
        },
        sectionTitle: {
            marginBottom: theme.spacing.md,
        },
        checkboxContainer: {
            margin: 0,
            paddingHorizontal: 0,
        },
        checkboxText: {
            paddingHorizontal: theme.spacing.md,
            textAlign: 'left',
        },
        buttonContainer: {
            marginBottom: theme.spacing.md,
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
        version: {
            marginBottom: theme.spacing.sm,
        },
        fediMod: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: theme.spacing.md,
        },
    })

export default DeveloperSettings
