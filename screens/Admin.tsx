import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import React from 'react'
import { useTranslation } from 'react-i18next'
import {
    Dimensions,
    GestureResponderEvent,
    ImageBackground,
    ImageSourcePropType,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native'
import { Icon, Image, Text, Theme, useTheme } from '@rneui/themed'

import type { HomeTabsParamList, RootStackParamList } from '../types/navigation'
import { Images } from '../assets/images'
import {
    setUserIsGuardian,
    useBridge,
    useFederationsContext,
} from '../contexts/FederationsContext'

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
            <Text h4 h4Style={styles(theme).settingsItemLabel}>
                {label}
            </Text>
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
        <View style={styles(theme).container}>
            <View style={styles(theme).profileHeader}>
                <Text h4>{t('words.admin')}</Text>
                {/*
                    TODO: Replace with username set during onboarding
                */}
                <ImageBackground
                    source={Images.HoloBackground}
                    style={styles(theme).profileCircle}
                    imageStyle={styles(theme).circleBorder}>
                    <Text h3>{'SN'}</Text>
                </ImageBackground>
                <Text h3>{'Satoshi Nakomoto'}</Text>
            </View>

            <View style={styles(theme).sectionContainer}>
                <Text h4 h4Style={styles(theme).sectionTitle}>
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
                <Text h4 h4Style={styles(theme).sectionTitle}>
                    {t('words.wallet')}
                </Text>
                <SettingsItem
                    imageSource={Images.Wallet}
                    label={t('feature.backup.backup-wallet')}
                    onPress={() => navigation.navigate('ChooseBackupMethod')}
                />
                <SettingsItem
                    imageSource={Images.Recovery}
                    label={t('feature.recovery.recover-wallet')}
                    onPress={() => navigation.navigate('ChooseRecoveryMethod')}
                />
            </View>
            <View>
                <Text h4 h4Style={styles(theme).sectionTitle}>
                    {t('words.general')}
                </Text>
                <SettingsItem
                    imageSource={Images.FediLogoIcon}
                    label={t('phrases.app-settings-security')}
                    onPress={() => {}}
                />
            </View>
        </View>
    )
}

const WINDOW_WIDTH = Dimensions.get('window').width
const CIRCLE_SIZE = WINDOW_WIDTH * 0.25

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            justifyContent: 'space-evenly',
            paddingHorizontal: 24,
        },
        profileHeader: {
            alignItems: 'center',
        },
        profileCircle: {
            height: CIRCLE_SIZE,
            width: CIRCLE_SIZE,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 24,
            marginBottom: 16,
        },
        circleBorder: {
            borderRadius: CIRCLE_SIZE * 0.5,
        },
        sectionContainer: {
            flexDirection: 'column',
            alignItems: 'flex-start',
        },
        sectionTitle: {
            color: theme.colors.primaryLight,
            fontWeight: '400',
            paddingVertical: 6,
        },
        settingsItemContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 10,
            width: '100%',
        },
        settingsItemImage: {
            height: theme.sizes.sm,
            width: theme.sizes.sm,
        },
        settingsItemLabel: {
            flexGrow: 1,
            color: theme.colors.primary,
            fontWeight: '400',
            paddingHorizontal: 12,
        },
        settingsItemArrow: {
            alignSelf: 'flex-end',
        },
    })

export default Admin
