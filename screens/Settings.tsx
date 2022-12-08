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

import type { HomeTabsParamList } from './Home'
import type { RootStackParamList } from '../Router'
import { Images } from '../assets/images'

export type Props = BottomTabScreenProps<
    HomeTabsParamList & RootStackParamList,
    'Settings'
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

const Settings: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()

    return (
        <View style={styles(theme).container}>
            <View style={styles(theme).profileHeader}>
                <Text h4>{t('words.settings')}</Text>
                {/*
                    TODO: Replace with username set during onboarding
                */}
                <ImageBackground
                    source={Images.HoloBackground}
                    style={styles(theme).profileCircle}
                    imageStyle={styles(theme).roundCircle}>
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
                    onPress={() => {}}
                />
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
                    label={t('feature.backup.backup-your-wallet')}
                    onPress={() => navigation.navigate('Backup')}
                />
                <SettingsItem
                    imageSource={Images.Recovery}
                    label={t('feature.backup.recover-your-wallet')}
                    onPress={() => {}}
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
        roundCircle: {
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
            height: 24,
            width: 24,
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

export default Settings
