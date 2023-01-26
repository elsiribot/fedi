import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ImageBackground, ScrollView, StyleSheet, View } from 'react-native'

import { Images } from '../assets/images'
import {
    AlarmSvg,
    CashSvg,
    ChatHistorySvg,
    InviteMembersSvg,
    LeaveRoomSvg,
    PhotoSvg,
    RoomSvg,
    SocialPeopleSvg,
} from '../assets/images/svgs'
import SettingsItem from '../components/feature/admin/SettingsItem'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'GroupAdmin'>

const GroupAdmin: React.FC<Props> = ({ navigation, route }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { group } = route.params

    return (
        <ScrollView contentContainerStyle={styles(theme).container}>
            <View style={styles(theme).profileHeader}>
                <ImageBackground
                    source={Images.HoloBackground}
                    style={styles(theme).profileCircle}
                    imageStyle={styles(theme).circleBorder}>
                    <RoomSvg height={theme.sizes.md} width={theme.sizes.md} />
                </ImageBackground>
                <Text h2 style={styles(theme).groupNameText}>
                    {group.name}
                </Text>
            </View>
            <View style={styles(theme).sectionContainer}>
                <Text style={styles(theme).sectionTitle}>
                    {t('words.group')}
                </Text>
                <SettingsItem
                    disabled
                    imageSource={
                        <SocialPeopleSvg
                            height={theme.sizes.sm}
                            width={theme.sizes.sm}
                        />
                    }
                    label={t('words.members')}
                    onPress={() => {}}
                />
                <SettingsItem
                    imageSource={
                        <RoomSvg
                            height={theme.sizes.sm}
                            width={theme.sizes.sm}
                        />
                    }
                    label={t('feature.community.invite-to-group')}
                    onPress={() => {
                        navigation.navigate('GroupInvite', {
                            group,
                        })
                    }}
                />
                <SettingsItem
                    disabled
                    imageSource={
                        <LeaveRoomSvg
                            height={theme.sizes.sm}
                            width={theme.sizes.sm}
                        />
                    }
                    label={t('feature.community.leave-group')}
                    onPress={() => {}}
                />
                <SettingsItem
                    disabled
                    imageSource={
                        <InviteMembersSvg
                            height={theme.sizes.sm}
                            width={theme.sizes.sm}
                        />
                    }
                    label={t('feature.community.broadcast-only')}
                    onPress={() => {}}
                />
            </View>
            <View>
                <Text style={styles(theme).sectionTitle}>
                    {t('words.messages')}
                </Text>
                <SettingsItem
                    disabled
                    imageSource={
                        <AlarmSvg
                            height={theme.sizes.sm}
                            width={theme.sizes.sm}
                        />
                    }
                    label={t('feature.community.disappearing-messages')}
                    onPress={() => {}}
                />
                <SettingsItem
                    disabled
                    imageSource={
                        <ChatHistorySvg
                            height={theme.sizes.sm}
                            width={theme.sizes.sm}
                        />
                    }
                    label={t('feature.community.show-history-to-new-members')}
                    onPress={() => {}}
                />
                <SettingsItem
                    disabled
                    imageSource={
                        <PhotoSvg
                            height={theme.sizes.sm}
                            width={theme.sizes.sm}
                        />
                    }
                    label={t('feature.community.view-shared-media')}
                    onPress={() => {}}
                />
                <SettingsItem
                    disabled
                    imageSource={
                        <CashSvg
                            height={theme.sizes.sm}
                            width={theme.sizes.sm}
                        />
                    }
                    label={t('words.payments')}
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
        profileCircle: {
            height: theme.sizes.adminProfileCircle,
            width: theme.sizes.adminProfileCircle,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: theme.spacing.md,
        },
        circleBorder: {
            borderRadius: theme.sizes.adminProfileCircle * 0.5,
        },
        groupNameText: {
            textAlign: 'center',
        },
        groupIcon: {
            height: theme.sizes.md,
            width: theme.sizes.md,
        },
        sectionContainer: {
            flexDirection: 'column',
            alignItems: 'flex-start',
        },
        sectionTitle: {
            color: theme.colors.primaryLight,
            paddingVertical: theme.spacing.sm,
        },
        settingsItemArrow: {
            alignSelf: 'flex-end',
        },
    })

export default GroupAdmin
