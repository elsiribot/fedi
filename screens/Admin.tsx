import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'

import { Images } from '../assets/images'
import SettingsItem from '../components/feature/admin/SettingsItem'
import HoloAvatar, { AvatarSize } from '../components/ui/HoloAvatar'
import {
    setUserIsGuardian,
    useFederationsContext,
} from '../state/contexts/FederationsContext'
import { useBridge } from '../state/hooks'
import type { HomeTabsParamList, RootStackParamList } from '../types/navigation'
import stringUtils from '../utils/StringUtils'

export type Props = BottomTabScreenProps<
    HomeTabsParamList & RootStackParamList,
    'Admin'
>

const Admin: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { authenticateGuardian } = useBridge()
    const { state, dispatch } = useFederationsContext()
    const { selectedFederation } = state

    const simulateGuardianAuthentication = async () => {
        try {
            await authenticateGuardian('mocksecret')
            dispatch(setUserIsGuardian(true))
        } catch (error) {
            dispatch(setUserIsGuardian(false))
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
                {state.userIsGuardian ? (
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
                    disabled
                    imageSource={Images.LeaveFederation}
                    label={t('feature.federations.leave-federation')}
                    onPress={() => {}}
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
                    onPress={() => navigation.navigate('ChooseRecoveryMethod')}
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
                    onPress={() => {}}
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
