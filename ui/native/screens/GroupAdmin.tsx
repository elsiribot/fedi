import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ImageBackground, ScrollView, StyleSheet, View } from 'react-native'

import { Images } from '../assets/images'
import SettingsItem from '../components/feature/admin/SettingsItem'
import SvgImage, { SvgImageSize } from '../components/ui/SvgImage'
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
                    <SvgImage name="Room" size={SvgImageSize.md} />
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
                    image={<SvgImage name="SocialPeople" />}
                    label={t('words.members')}
                    onPress={() => {}}
                />
                <SettingsItem
                    image={<SvgImage name="Room" />}
                    label={t('feature.chat.invite-to-group')}
                    onPress={() => {
                        navigation.navigate('GroupInvite', {
                            group,
                        })
                    }}
                />
                <SettingsItem
                    disabled
                    image={<SvgImage name="LeaveRoom" />}
                    label={t('feature.chat.leave-group')}
                    onPress={() => {}}
                />
                <SettingsItem
                    disabled
                    image={<SvgImage name="InviteMembers" />}
                    label={t('feature.chat.broadcast-only')}
                    onPress={() => {}}
                />
            </View>
            <View>
                <Text style={styles(theme).sectionTitle}>
                    {t('words.messages')}
                </Text>
                <SettingsItem
                    disabled
                    image={<SvgImage name="Alarm" />}
                    label={t('feature.chat.disappearing-messages')}
                    onPress={() => {}}
                />
                <SettingsItem
                    disabled
                    image={<SvgImage name="ChatHistory" />}
                    label={t('feature.chat.show-history-to-new-members')}
                    onPress={() => {}}
                />
                <SettingsItem
                    disabled
                    image={<SvgImage name="Photo" />}
                    label={t('feature.chat.view-shared-media')}
                    onPress={() => {}}
                />
                <SettingsItem
                    disabled
                    image={<SvgImage name="Cash" />}
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
