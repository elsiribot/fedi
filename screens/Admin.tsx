import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { Icon, Image, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import {
    GestureResponderEvent,
    ImageBackground,
    ImageSourcePropType,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native'

import { Images } from '../assets/images'
import {
    setUserIsGuardian,
    useFederationsContext,
} from '../state/contexts/FederationsContext'
import { useBridge } from '../state/hooks'
import type { HomeTabsParamList, RootStackParamList } from '../types/navigation'

export type Props = BottomTabScreenProps<
    HomeTabsParamList & RootStackParamList,
    'Admin'
>

type SettingsItemProps = {
    imageSource: ImageSourcePropType
    label: string
    onPress: (event: GestureResponderEvent) => void
}

const SettingsItem = ({ imageSource, label, onPress }: SettingsItemProps) => {
    const { theme } = useTheme()
    return (
        <TouchableOpacity
            style={styles(theme).settingsItemContainer}
            onPress={onPress}>
            <Image
                source={imageSource}
                style={styles(theme).settingsItemImage}
            />
            <Text style={styles(theme).settingsItemLabel}>{label}</Text>
            <Icon
                name={'angle-right'}
                type={'font-awesome'}
                color={theme.colors.primaryLight}
                containerStyle={styles(theme).settingsItemArrow}
            />
        </TouchableOpacity>
    )
}

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
                <ImageBackground
                    source={Images.HoloBackground}
                    style={styles(theme).profileCircle}
                    imageStyle={styles(theme).circleBorder}>
                    <Text h2>{'SN'}</Text>
                </ImageBackground>
                <Text h2>{'Satoshi Nakomoto'}</Text>
            </View>
            {/* TODO: Add offline status indicator here */}
            <View style={styles(theme).sectionContainer}>
                <Text style={styles(theme).sectionTitle}>
                    {t('words.federation')}
                </Text>
                <SettingsItem
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
        profileCircle: {
            height: theme.sizes.adminProfileCircle,
            width: theme.sizes.adminProfileCircle,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: theme.spacing.xl,
            marginBottom: theme.spacing.md,
        },
        circleBorder: {
            borderRadius: theme.sizes.adminProfileCircle * 0.5,
        },
        sectionContainer: {
            flexDirection: 'column',
            alignItems: 'flex-start',
        },
        sectionTitle: {
            color: theme.colors.primaryLight,
            paddingVertical: theme.spacing.sm,
        },
        settingsItemContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: theme.spacing.md,
            width: '100%',
        },
        settingsItemImage: {
            height: theme.sizes.sm,
            width: theme.sizes.sm,
        },
        settingsItemLabel: {
            flexGrow: 1,
            color: theme.colors.primary,
            paddingHorizontal: theme.spacing.md,
        },
        settingsItemArrow: {
            alignSelf: 'flex-end',
        },
    })

export default Admin
