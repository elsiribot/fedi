import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Input, Switch, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native'
import Share from 'react-native-share'

import {
    changeAuthenticatedGuardian,
    removeCustomFediMod,
    resetAuthenticatedMember,
    resetFederationChatState,
    selectActiveFederation,
    selectFederationCustomFediMods,
    selectFediModDebugMode,
    selectOnchainDepositsEnabled,
    setChatGroups,
    setChatMembersSeen,
    setChatMessages,
    setFediModDebugMode,
    setOnchainDepositsEnabled,
    selectStableBalanceEnabled,
    setStableBalanceEnabled,
    resetNuxSteps,
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
import { GuardianStatus } from '@fedi/common/types/bindings'
import {
    makeBase64CSVUri,
    makeCSVFilename,
    makeTransactionHistoryCSV,
} from '@fedi/common/utils/csv'
import { formatErrorMessage } from '@fedi/common/utils/format'

import { fedimint } from '../bridge'
import { AddCustomFediModDialog } from '../components/feature/developer-settings/AddCustomFediModDialog'
import CheckBox from '../components/ui/CheckBox'
import SvgImage from '../components/ui/SvgImage'
import { version } from '../package.json'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppDispatch, useAppSelector, useBridge } from '../state/hooks'
import { RootStackParamList } from '../types/navigation'
import { shareLogsExport } from '../utils/logs-export'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'DeveloperSettings'
>

const DeveloperSettings: React.FC<Props> = () => {
    const { theme } = useTheme()
    const { t, i18n } = useTranslation()
    const { listGateways, switchGateway, guardianStatus } = useBridge()
    const { toast } = useEnvironmentContext().state
    const [isLoadingGateways, setIsLoadingGateways] = useState<boolean>(false)
    const [selectedLanguage, setSelectedLanguage] = useState<string>(
        i18n.language,
    )
    const [gateways, setGateways] = useState<LightningGateway[]>([])
    const [isAddingCustomFediMod, setIsAddingCustomFediMod] =
        useState<boolean>(false)
    const [isSharingLogs, setIsSharingLogs] = useState(false)
    const [guardianOnlineStatus, setGuardianOnlineStatus] = useState<
        GuardianStatus[]
    >([])
    const selectedFiatCurrency = useAppSelector(selectCurrency)
    const customFediMods = useAppSelector(selectFederationCustomFediMods)
    const fediModDebugMode = useAppSelector(selectFediModDebugMode)
    const onchainDepositsEnabled = useAppSelector(selectOnchainDepositsEnabled)
    const stableBalanceEnabled = useAppSelector(selectStableBalanceEnabled)

    // This is a partial refactor of state management from context to redux
    const reduxDispatch = useAppDispatch()
    const activeFederation = useAppSelector(selectActiveFederation)
    const authenticatedGuardian = useAppSelector(
        s => s.federation.authenticatedGuardian,
    )

    useEffect(() => {
        const loadGuardianStatus = async () => {
            const status = await guardianStatus()
            setGuardianOnlineStatus(status)
        }

        loadGuardianStatus()
    }, [guardianStatus])

    useEffect(() => {
        const getGatewaysList = async () => {
            setIsLoadingGateways(true)
            try {
                const _gateways = await listGateways()
                setGateways(_gateways)
            } catch (e) {
                toast?.show(t('errors.failed-to-fetch-gateways'), 3000)
            }
            setIsLoadingGateways(false)
        }

        getGatewaysList()
    }, [toast, listGateways, t])

    const handleSelectGateway = async (gateway: LightningGateway) => {
        try {
            // v0 federation gateways use nodePubKey, v1 use gatewayId which isn't present for v0
            await switchGateway(
                'gatewayId' in gateway ? gateway.gatewayId : gateway.nodePubKey,
            )
        } catch (e) {
            toast?.show(t('errors.failed-to-switch-gateways'), 3000)
        }
        const updatedGateways = gateways.map((gw: LightningGateway) => {
            gw.active = gateway.nodePubKey === gw.nodePubKey
            return gw
        })
        setGateways(updatedGateways)
    }

    const handleShareLogs = async () => {
        setIsSharingLogs(true)
        try {
            await shareLogsExport()
        } catch (e) {
            toast?.show(formatErrorMessage(t, e, 'errors.unknown-error'))
        }
        setIsSharingLogs(false)
    }

    const shareTxCsv = async () => {
        try {
            if (!activeFederation) throw new Error('No active federation')
            const transactions = await fedimint.listTransactions(
                activeFederation.id,
            )
            await Share.open({
                filename: makeCSVFilename(
                    `transactions-${activeFederation.name}`,
                ),
                type: 'text/csv',
                url: makeBase64CSVUri(makeTransactionHistoryCSV(transactions)),
            })
        } catch (err) {
            toast?.show(formatErrorMessage(t, err, 'errors.unknown-error'))
        }
    }

    const removeFediMod = (fediModId: string) => {
        if (!activeFederation) return
        reduxDispatch(
            removeCustomFediMod({
                federationId: activeFederation.id,
                fediModId,
            }),
        )
        toast?.show(t('feature.fedimods.custom-fedimod-removed'), 3000)
    }

    useEffect(() => {
        i18n.changeLanguage(selectedLanguage)
    }, [i18n, selectedLanguage])

    return (
        <ScrollView contentContainerStyle={styles(theme).container}>
            <SettingsSection title="App info">
                <Text
                    style={styles(theme).version}>{`Version ${version}`}</Text>
                <Button
                    title={t('feature.developer.share-logs')}
                    containerStyle={styles(theme).buttonContainer}
                    onPress={handleShareLogs}
                    loading={isSharingLogs}
                />
            </SettingsSection>
            <SettingsSection title={t('feature.fedimods.custom-fedimods')}>
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
                    title={t('feature.fedimods.add-custom-fedimod')}
                    containerStyle={styles(theme).buttonContainer}
                    onPress={() => setIsAddingCustomFediMod(true)}
                />
                <AddCustomFediModDialog
                    isVisible={isAddingCustomFediMod}
                    onClose={() => setIsAddingCustomFediMod(false)}
                />
                <View style={styles(theme).switchWrapper}>
                    <View style={styles(theme).switchLabelContainer}>
                        <Text caption style={styles(theme).switchLabel}>
                            {t('feature.fedimods.debug-mode')}
                        </Text>
                        <Text small style={styles(theme).switchLabel}>
                            {t('feature.fedimods.debug-mode-info')}
                        </Text>
                    </View>
                    <Switch
                        value={fediModDebugMode}
                        onValueChange={value => {
                            reduxDispatch(setFediModDebugMode(value))
                        }}
                    />
                </View>
            </SettingsSection>
            <SettingsSection title="Change your language">
                {/* TODO: Change to iterating over array of languages */}
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
                <CheckBox
                    title={
                        <Text style={styles(theme).checkboxText}>
                            {'Indonesian'}
                        </Text>
                    }
                    checked={selectedLanguage === 'id'}
                    onPress={() => setSelectedLanguage('id')}
                    containerStyle={styles(theme).checkboxContainer}
                />
            </SettingsSection>
            <SettingsSection title="Change your currency">
                {Object.values(SupportedCurrency).map(currency => (
                    <CheckBox
                        key={currency}
                        title={
                            <Text style={styles(theme).checkboxText}>
                                {currency}
                            </Text>
                        }
                        checked={selectedFiatCurrency === currency}
                        onPress={() =>
                            reduxDispatch(changeSelectedFiatCurrency(currency))
                        }
                        containerStyle={styles(theme).checkboxContainer}
                    />
                ))}
            </SettingsSection>
            <SettingsSection title="Change your lightning gateway">
                {isLoadingGateways && <ActivityIndicator />}
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
            <SettingsSection title={t('words.wallet')}>
                <Button
                    title={t('feature.developer.export-transactions-csv')}
                    containerStyle={styles(theme).buttonContainer}
                    onPress={shareTxCsv}
                />
                <View style={styles(theme).switchWrapper}>
                    <View style={styles(theme).switchLabelContainer}>
                        <Text caption style={styles(theme).switchLabel}>
                            {t('feature.receive.enable-onchain-deposits')}
                        </Text>
                    </View>
                    <Switch
                        value={onchainDepositsEnabled}
                        onValueChange={value => {
                            reduxDispatch(setOnchainDepositsEnabled(value))
                        }}
                    />
                </View>
                <View style={styles(theme).switchWrapper}>
                    <View style={styles(theme).switchLabelContainer}>
                        <Text caption style={styles(theme).switchLabel}>
                            {t('feature.fedimods.stable-balance-enabled')}
                        </Text>
                        <Text small style={styles(theme).switchLabel}>
                            {t('feature.fedimods.stable-balance-enabled-info')}
                        </Text>
                    </View>
                    <Switch
                        value={stableBalanceEnabled}
                        onValueChange={value => {
                            reduxDispatch(setStableBalanceEnabled(value))
                        }}
                    />
                </View>
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

            <SettingsSection title="Guardian Status">
                {guardianOnlineStatus.map((n, index) => {
                    let statusText
                    let statusStyle

                    if ('online' in n) {
                        statusText = `Guardian ${n.online.guardian}: Online`
                        statusStyle = styles(theme).onlineStatus
                    }
                    if ('error' in n) {
                        statusText = `Guardian  ${n.error.guardian} Error: ${n.error.error}`
                        statusStyle = styles(theme).errorStatus
                    }
                    if ('timeout' in n) {
                        statusText = `Guardian  ${n.timeout.guardian} Timeout: ${n.timeout.elapsed}`
                        statusStyle = styles(theme).timeoutStatus
                    }

                    return (
                        <Text key={index} style={statusStyle}>
                            {statusText}
                        </Text>
                    )
                })}
            </SettingsSection>
            <SettingsSection title="Danger zone">
                <Button
                    title="Reset new user experience"
                    containerStyle={styles(theme).buttonContainer}
                    onPress={() => {
                        reduxDispatch(resetNuxSteps())
                        toast?.show('NUX reset!')
                    }}
                />
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
                        }
                    }}
                />
                <Button
                    title={'Delete all groups'}
                    containerStyle={styles(theme).buttonContainer}
                    onPress={() => {
                        if (activeFederation) {
                            reduxDispatch(
                                setChatGroups({
                                    federationId: activeFederation.id,
                                    groups: [],
                                }),
                            )
                        }
                    }}
                />
                <Button
                    title={'Delete all messages'}
                    containerStyle={styles(theme).buttonContainer}
                    onPress={() => {
                        if (activeFederation) {
                            reduxDispatch(
                                setChatMessages({
                                    federationId: activeFederation.id,
                                    messages: [],
                                }),
                            )
                        }
                    }}
                />
                <Button
                    title={'Delete all members seen'}
                    containerStyle={styles(theme).buttonContainer}
                    onPress={() => {
                        if (activeFederation) {
                            reduxDispatch(
                                setChatMembersSeen({
                                    federationId: activeFederation.id,
                                    membersSeen: [],
                                }),
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
            <Text bold style={styles(theme).sectionTitle}>
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
        switchWrapper: {
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: theme.spacing.md,
        },
        switchLabelContainer: {
            maxWidth: '70%',
        },
        switchLabel: {
            textAlign: 'left',
            marginBottom: theme.spacing.xs,
        },
        onlineStatus: {
            color: 'green',
        },
        errorStatus: {
            color: 'red',
        },
        timeoutStatus: {
            color: 'orange',
        },
    })

export default DeveloperSettings
