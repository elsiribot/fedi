import AsyncStorage from '@react-native-async-storage/async-storage'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { getShowInviteCode } from '@fedi/common/types/fedimint'
import amountUtils from '@fedi/common/utils/AmountUtils'
import stringUtils from '@fedi/common/utils/StringUtils'

import { fedimint } from '../bridge'
import SettingsItem from '../components/feature/admin/SettingsItem'
import HoloAvatar, { AvatarSize } from '../components/ui/HoloAvatar'
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
import {
    changeDeveloperMode,
    useEnvironmentContext,
} from '../state/contexts/EnvironmentContext'
import {
    changeAuthenticatedGuardian,
    updateFederations,
    useFederationsContext,
} from '../state/contexts/FederationsContext'
import { useBridge } from '../state/hooks'
import type {
    RootStackParamList,
    TabsNavigatorParamList,
} from '../types/navigation'

export type Props = BottomTabScreenProps<
    TabsNavigatorParamList & RootStackParamList,
    'Admin'
>

const Admin: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { leaveFederation } = useBridge()
    const { state: environmentState, dispatch: environmentDispatch } =
        useEnvironmentContext()
    const { state: federationsState, dispatch: federationsDispatch } =
        useFederationsContext()
    const { dispatch: chatDispatch } = useChatContext()
    const { toast } = useEnvironmentContext().state
    const { selectedFederation } = federationsState
    const [unlockDevModeCount, setUnlockDevModeCount] = useState<number>(0)

    const resetChatState = () => {
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
    }
    const resetGuardiansState = () => {
        federationsDispatch(changeAuthenticatedGuardian(null))
        AsyncStorage.removeItem(AUTHENTICATED_GUARDIAN_DB_KEY)
    }

    // FIXME: this needs some kind of loading state
    // TODO: this should be an thunkified action creator
    const handleLeaveFederation = async () => {
        try {
            await leaveFederation()
        } catch (e) {
            toast?.show('Failed to leave federation', 3000)
            return
        }
        resetChatState()
        resetGuardiansState()

        // update context and navigate
        const federations = await fedimint.listFederations()
        if (federations.length > 0) {
            federationsDispatch(
                // FIXME: this is error-prone
                updateFederations(federations[0].id, federations),
            )
            // FIXME: this doesn't do enough ...
            navigation.navigate('TabsNavigator')
        } else {
            navigation.navigate('Splash')
            federationsDispatch(updateFederations(null, federations))
        }
    }

    const confirmLeaveFederation = () => {
        // Only allow leaving if they have less than 100 sats
        if (amountUtils.msatToSat(selectedFederation!.balance) > 100) {
            Alert.alert(
                t('feature.federations.leave-federation'),
                t('feature.federations.leave-federation-withdraw-first'),
                [
                    {
                        text: t('words.okay'),
                    },
                ],
            )
        } else {
            Alert.alert(
                t('feature.federations.leave-federation'),
                t('feature.federations.leave-federation-confirmation'),
                [
                    {
                        text: t('words.no'),
                    },
                    {
                        text: t('words.yes'),
                        onPress: handleLeaveFederation,
                    },
                ],
            )
        }
    }

    const onChooseRecovery = () => {
        // Only allow recovery for wallets with less than 100 sats
        // FIXME: a bit of a race condition here if a user starts a recovery with 0 sats, then receives and tries this again
        if (selectedFederation!.balance > 100000) {
            Alert.alert(
                t('feature.recovery.recover-wallet'),
                t('feature.recovery.recover-wallet-with-balance'),
                [
                    {
                        text: t('words.okay'),
                    },
                ],
            )
        } else {
            navigation.navigate('ChooseRecoveryMethod')
        }
    }

    return (
        <ScrollView contentContainerStyle={styles(theme).container}>
            <View style={styles(theme).profileHeader}>
                <View style={styles(theme).avatarContainer}>
                    <HoloAvatar
                        size={AvatarSize.lg}
                        title={stringUtils.getInitialsFromName(
                            selectedFederation?.username || '',
                        )}
                    />
                </View>
                <Text h2 medium>
                    {selectedFederation?.username}
                </Text>
            </View>
            {/* TODO: Add offline status indicator here */}
            <View style={styles(theme).sectionContainer}>
                <Text style={styles(theme).sectionTitle}>
                    {t('words.federation')}
                </Text>
                <SettingsItem
                    disabled
                    image={<SvgImage name="Federation" />}
                    label={t('feature.federations.federation-details')}
                    onPress={() => {}}
                />
                {selectedFederation &&
                    getShowInviteCode(selectedFederation) && (
                        <SettingsItem
                            image={<SvgImage name="InviteMembers" />}
                            label={t('feature.federations.invite-members')}
                            onPress={() => {
                                navigation.navigate('FederationInvite', {
                                    // FIXME: we should know that we have a selectedFederation here ...
                                    inviteLink: selectedFederation
                                        ? selectedFederation.connectInfo
                                        : '',
                                })
                            }}
                        />
                    )}
                {federationsState.authenticatedGuardian !== null && (
                    <SettingsItem
                        image={<SvgImage name="SocialPeople" />}
                        label={t('feature.recovery.recovery-assist')}
                        onPress={() => {
                            navigation.navigate('StartRecoveryAssist')
                        }}
                    />
                )}
                <SettingsItem
                    image={<SvgImage name="LeaveFederation" />}
                    label={t('feature.federations.leave-federation')}
                    onPress={confirmLeaveFederation}
                />
            </View>
            <View>
                <Text style={styles(theme).sectionTitle}>
                    {t('words.wallet')}
                </Text>
                <SettingsItem
                    image={<SvgImage name="Wallet" />}
                    label={t('feature.backup.backup-wallet')}
                    onPress={() => navigation.navigate('ChooseBackupMethod')}
                />
                <SettingsItem
                    image={<SvgImage name="Recovery" />}
                    label={t('feature.recovery.recover-a-wallet')}
                    onPress={onChooseRecovery}
                />
            </View>
            <View>
                <Pressable
                    onPress={() => {
                        setUnlockDevModeCount(unlockDevModeCount + 1)
                        if (unlockDevModeCount > 10) {
                            environmentDispatch(changeDeveloperMode(true))
                        }
                    }}>
                    <Text style={styles(theme).sectionTitle}>
                        {t('words.general')}
                    </Text>
                </Pressable>
                {environmentState.developerMode && (
                    <SettingsItem
                        image={<SvgImage name="FediLogoIcon" />}
                        label={'Developer Settings'}
                        onPress={() => navigation.navigate('DeveloperSettings')}
                    />
                )}
                <SettingsItem
                    disabled
                    image={<SvgImage name="FediLogoIcon" />}
                    label={t('phrases.app-settings-security')}
                    onPress={() => {}}
                />
            </View>
        </ScrollView>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            justifyContent: 'space-evenly',
            padding: theme.spacing.xl,
        },
        profileHeader: {
            alignItems: 'center',
            paddingBottom: theme.spacing.lg,
        },
        avatarContainer: {
            marginTop: theme.spacing.xl,
            marginBottom: theme.spacing.md,
        },
        sectionContainer: {
            flexDirection: 'column',
            alignItems: 'flex-start',
        },
        sectionTitle: {
            color: theme.colors.primaryLight,
            paddingVertical: theme.spacing.sm,
        },
    })

export default Admin
