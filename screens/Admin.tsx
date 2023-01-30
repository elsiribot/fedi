import AsyncStorage from '@react-native-async-storage/async-storage'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, ScrollView, StyleSheet, View } from 'react-native'

import { listFederations } from '../bridge'
import SettingsItem from '../components/feature/admin/SettingsItem'
import HoloAvatar, { AvatarSize } from '../components/ui/HoloAvatar'
import SvgImage from '../components/ui/SvgImage'
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
import {
    updateFederations,
    useFederationsContext,
} from '../state/contexts/FederationsContext'
import { useBridge } from '../state/hooks'
import type { HomeTabsParamList, RootStackParamList } from '../types/navigation'
import AmountUtils from '../utils/AmountUtils'
import stringUtils from '../utils/StringUtils'

export type Props = BottomTabScreenProps<
    HomeTabsParamList & RootStackParamList,
    'Admin'
>

const Admin: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { leaveFederation } = useBridge()
    const { state, dispatch: federationsDispatch } = useFederationsContext()
    const { dispatch: communityDispatch } = useCommunityContext()
    const { selectedFederation } = state
    const [userIsGuardian, setUserIsGuardian] = useState(false)

    const simulateGuardianAuthentication = async () => {
        setUserIsGuardian(true)
    }

    const resetCommunityState = () => {
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
    }

    // FIXME: this needs some kind of loading state
    // TODO: this should be an thunkified action creator
    const handleLeaveFederation = async () => {
        // leave federation
        await leaveFederation()
        resetCommunityState()

        // update context and navigate
        const federations = await listFederations()
        if (federations.length > 0) {
            federationsDispatch(
                updateFederations(federations[0].name, federations),
            )
            // FIXME: this doesn't do enough ...
            navigation.navigate('Home')
        } else {
            navigation.navigate('Splash')
            federationsDispatch(updateFederations(null, federations))
        }
    }

    const confirmLeaveFederation = () => {
        // Only allow leaving if they have less than 100 sats
        if (AmountUtils.msatToSat(selectedFederation!.balance) > 100) {
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
                        text: 'No',
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
                <Text bold>{t('words.admin')}</Text>
                {/*
                    TODO: Replace with username set during onboarding
                */}
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
                <SettingsItem
                    image={<SvgImage name="InviteMembers" />}
                    label={t('feature.federations.invite-members')}
                    onPress={() => {
                        navigation.navigate('FederationInvite', {
                            inviteLink: selectedFederation
                                ? JSON.stringify(selectedFederation.connectInfo)
                                : '',
                        })
                    }}
                />
                {userIsGuardian ? (
                    <SettingsItem
                        image={<SvgImage name="SocialPeople" />}
                        label={t('feature.recovery.recovery-assist')}
                        onPress={() => {
                            navigation.navigate('StartRecoveryAssist')
                        }}
                    />
                ) : (
                    <SettingsItem
                        image={<SvgImage name="FediLogoIcon" />}
                        label={'DEV: Activate Guardian Mode'}
                        onPress={simulateGuardianAuthentication}
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
                <Text style={styles(theme).sectionTitle}>
                    {t('words.general')}
                </Text>
                <SettingsItem
                    disabled
                    image={<SvgImage name="FediLogoIcon" />}
                    label={t('phrases.app-settings-security')}
                    onPress={confirmLeaveFederation}
                />
                <SettingsItem
                    image={<SvgImage name="FediLogoIcon" />}
                    label={'Developer Settings'}
                    onPress={() => navigation.navigate('DeveloperSettings')}
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
