import AsyncStorage from '@react-native-async-storage/async-storage'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native'

import {
    changeAuthenticatedGuardian,
    leaveFederation,
    resetFederationChatState,
    selectActiveFederation,
    selectAuthenticatedMember,
} from '@fedi/common/redux'
import amountUtils from '@fedi/common/utils/AmountUtils'
import {
    shouldShowInviteCode,
    shouldShowSocialRecovery,
} from '@fedi/common/utils/FederationUtils'
import stringUtils from '@fedi/common/utils/StringUtils'

import { fedimint } from '../bridge'
import SettingsItem from '../components/feature/admin/SettingsItem'
import HoloAvatar, { AvatarSize } from '../components/ui/HoloAvatar'
import SvgImage from '../components/ui/SvgImage'
import {
    ACTIVE_FEDERATION_ID_DB_KEY,
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
import { useAppDispatch, useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>

const Settings: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { state: environmentState, dispatch: environmentDispatch } =
        useEnvironmentContext()
    const { dispatch: chatDispatch } = useChatContext()
    const { toast } = useEnvironmentContext().state
    const [unlockDevModeCount, setUnlockDevModeCount] = useState<number>(0)

    const dispatch = useAppDispatch()
    const activeFederationId = useAppSelector(
        s => s.federation.activeFederationId,
    )
    const activeFederation = useAppSelector(selectActiveFederation)
    const authenticatedMember = useAppSelector(selectAuthenticatedMember)
    const authenticatedGuardian = useAppSelector(
        s => s.federation.authenticatedGuardian,
    )

    const resetChatState = useCallback(() => {
        if (activeFederationId) {
            dispatch(
                resetFederationChatState({
                    federationId: activeFederationId,
                }),
            )
            chatDispatch(receiveMembersSeen([]))
            chatDispatch(receiveMessages([]))
            chatDispatch(receiveGroups(DEFAULT_GROUPS))
            AsyncStorage.setItem(
                `${CHAT_MEMBERS_PERSISTENCE_KEY}:${activeFederationId}`,
                JSON.stringify({ members: [] }),
            )
            AsyncStorage.setItem(
                `${CHAT_MESSAGES_PERSISTENCE_KEY}:${activeFederationId}`,
                JSON.stringify({ messages: [] }),
            )
            AsyncStorage.setItem(
                `${CHAT_GROUPS_PERSISTENCE_KEY}:${activeFederationId}`,
                JSON.stringify({ groups: DEFAULT_GROUPS }),
            )
        }
    }, [activeFederationId, chatDispatch, dispatch])

    const resetGuardiansState = useCallback(() => {
        dispatch(changeAuthenticatedGuardian(null))
        AsyncStorage.removeItem(AUTHENTICATED_GUARDIAN_DB_KEY)
    }, [dispatch])

    // FIXME: this needs some kind of loading state
    // TODO: this should be an thunkified action creator
    const handleLeaveFederation = useCallback(async () => {
        try {
            if (activeFederationId) {
                resetChatState()
                resetGuardiansState()
                AsyncStorage.removeItem(ACTIVE_FEDERATION_ID_DB_KEY)
                await dispatch(
                    leaveFederation({
                        fedimint,
                        federationId: activeFederationId,
                    }),
                ).unwrap()
            }
        } catch (e) {
            toast?.show('Failed to leave federation', 3000)
            return
        }
    }, [
        activeFederationId,
        dispatch,
        resetChatState,
        resetGuardiansState,
        toast,
    ])

    const confirmLeaveFederation = () => {
        // Only allow leaving if they have less than 100 sats
        if (amountUtils.msatToSat(activeFederation!.balance) > 100) {
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
        if (activeFederation!.balance > 100000) {
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

    const showInviteCode =
        activeFederation && shouldShowInviteCode(activeFederation.meta)

    const showSocialRecovery =
        activeFederation && shouldShowSocialRecovery(activeFederation.meta)

    return (
        <ScrollView contentContainerStyle={styles(theme).container}>
            {authenticatedMember && (
                <View style={styles(theme).profileHeader}>
                    <View style={styles(theme).avatarContainer}>
                        <HoloAvatar
                            size={AvatarSize.lg}
                            title={stringUtils.getInitialsFromName(
                                authenticatedMember?.username || '',
                            )}
                        />
                    </View>
                    <Text h2 medium>
                        {authenticatedMember?.username || 'satoshi'}
                    </Text>
                </View>
            )}
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
                {showInviteCode && (
                    <SettingsItem
                        image={<SvgImage name="InviteMembers" />}
                        label={t('feature.federations.invite-members')}
                        onPress={() => {
                            navigation.navigate('FederationInvite', {
                                inviteLink: activeFederation.connectInfo,
                            })
                        }}
                    />
                )}
                {showSocialRecovery && authenticatedGuardian !== null && (
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

export default Settings
