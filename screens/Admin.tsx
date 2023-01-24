import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, ScrollView, StyleSheet, View } from 'react-native'

import { Images } from '../assets/images'
import { listFederations } from '../bridge'
import SettingsItem from '../components/feature/admin/SettingsItem'
import HoloAvatar, { AvatarSize } from '../components/ui/HoloAvatar'
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
    const { state, dispatch } = useFederationsContext()
    const { selectedFederation } = state
    const [userIsGuardian, setUserIsGuardian] = useState(false)

    const simulateGuardianAuthentication = async () => {
        setUserIsGuardian(true)
    }

    // FIXME: this needs some kind of loading state
    // TODO: this should be an thunkified action creator
    const handleLeaveFederation = async () => {
        // leave federation
        await leaveFederation()

        // update context and navigate
        const federations = await listFederations()
        if (federations.length > 0) {
            dispatch(updateFederations(federations[0].name, federations))
            // FIXME: this doesn't do enough ...
            navigation.navigate('Home')
        } else {
            navigation.navigate('Splash')
            dispatch(updateFederations(null, federations))
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
                        text: t('words.ok'),
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
                    imageSource={Images.Federation}
                    label={t('feature.federations.federation-details')}
                    onPress={() => {}}
                />
                <SettingsItem
                    imageSource={Images.InviteMembers}
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
                        imageSource={Images.SocialPeople}
                        label={t('feature.recovery.recovery-assist')}
                        onPress={() => {
                            navigation.navigate('StartRecoveryAssist')
                        }}
                    />
                ) : (
                    <SettingsItem
                        imageSource={Images.FediLogoIcon}
                        label={'DEV: Activate Guardian Mode'}
                        onPress={simulateGuardianAuthentication}
                    />
                )}

                <SettingsItem
                    imageSource={Images.LeaveFederation}
                    label={t('feature.federations.leave-federation')}
                    onPress={confirmLeaveFederation}
                />
            </View>
            <View>
                <Text style={styles(theme).sectionTitle}>
                    {t('words.wallet')}
                </Text>
                <SettingsItem
                    imageSource={Images.Wallet}
                    label={t('feature.backup.backup-wallet')}
                    onPress={() => navigation.navigate('ChooseBackupMethod')}
                />
                <SettingsItem
                    imageSource={Images.Recovery}
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
                    imageSource={Images.FediLogoIcon}
                    label={t('phrases.app-settings-security')}
                    onPress={confirmLeaveFederation}
                />
                <SettingsItem
                    imageSource={Images.FediLogoIcon}
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
