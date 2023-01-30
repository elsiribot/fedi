import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Image, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ImageBackground, ScrollView, StyleSheet, View } from 'react-native'

import { Images } from '../assets/images'
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
                    <Image
                        style={styles(theme).groupIcon}
                        source={Images.Room}
                    />
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
                    imageSource={Images.SocialPeople}
                    label={t('words.members')}
                    onPress={() => {}}
                />
                <SettingsItem
                    imageSource={Images.Room}
                    label={t('feature.community.invite-to-group')}
                    onPress={() => {
                        navigation.navigate('GroupInvite', {
                            group,
                        })
                    }}
                />
                <SettingsItem
                    disabled
                    imageSource={Images.LeaveRoom}
                    label={t('feature.community.leave-group')}
                    onPress={() => {}}
                />
                <SettingsItem
                    disabled
                    imageSource={Images.InviteMembers}
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
                    imageSource={Images.Alarm}
                    label={t('feature.community.disappearing-messages')}
                    onPress={() => {}}
                />
                <SettingsItem
                    disabled
                    imageSource={Images.ChatHistory}
                    label={t('feature.community.show-history-to-new-members')}
                    onPress={() => {}}
                />
                <SettingsItem
                    disabled
                    imageSource={Images.Photo}
                    label={t('feature.community.view-shared-media')}
                    onPress={() => {}}
                />
                <SettingsItem
                    disabled
                    imageSource={Images.Cash}
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
