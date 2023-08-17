import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Switch, Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageBackground, ScrollView, StyleSheet, View } from 'react-native'

import { selectChatGroup, selectChatGroupAffiliation } from '@fedi/common/redux'

import { Images } from '../assets/images'
import SettingsItem from '../components/feature/admin/SettingsItem'
import SvgImage, { SvgImageSize } from '../components/ui/SvgImage'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppSelector } from '../state/hooks'
import { ChatAffiliation } from '../types'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'GroupAdmin'>

const GroupAdmin: React.FC<Props> = ({ navigation, route }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { toast } = useEnvironmentContext().state
    const { groupId } = route.params
    const group = useAppSelector(s => selectChatGroup(s, groupId))
    const myAffiliation = useAppSelector(s =>
        selectChatGroupAffiliation(s, groupId),
    )
    const [broadcastOnly] = useState<boolean>(group?.broadcastOnly || false)

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
                    {group?.name || ''}
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
                    onPress={() => console.info('not implemented')}
                />
                <SettingsItem
                    image={<SvgImage name="Room" />}
                    label={t('feature.chat.invite-to-group')}
                    onPress={() => {
                        navigation.navigate('GroupInvite', {
                            groupId,
                        })
                    }}
                />
                <SettingsItem
                    disabled
                    image={<SvgImage name="LeaveRoom" />}
                    label={t('feature.chat.leave-group')}
                    onPress={() => console.info('not implemented')}
                />
                <SettingsItem
                    image={<SvgImage name="SpeakerPhone" />}
                    label={t('feature.chat.broadcast-only')}
                    action={<Switch value={broadcastOnly} disabled />}
                    onPress={() => {
                        toast?.show(
                            t('feature.chat.changing-broadcast-not-supported'),
                            3000,
                        )
                    }}
                />
                {broadcastOnly && (
                    <SettingsItem
                        image={<SvgImage name="SpeakerPhone" />}
                        label={t('feature.chat.broadcast-admin-settings')}
                        disabled={myAffiliation === ChatAffiliation.none}
                        onPress={() => {
                            navigation.navigate('BroadcastAdminsList', {
                                groupId,
                            })
                        }}
                    />
                )}
            </View>
            <View>
                <Text style={styles(theme).sectionTitle}>
                    {t('words.messages')}
                </Text>
                <SettingsItem
                    disabled
                    image={<SvgImage name="Alarm" />}
                    label={t('feature.chat.disappearing-messages')}
                    onPress={() => console.info('not implemented')}
                />
                <SettingsItem
                    disabled
                    image={<SvgImage name="ChatHistory" />}
                    label={t('feature.chat.show-history-to-new-members')}
                    onPress={() => console.info('not implemented')}
                />
                <SettingsItem
                    disabled
                    image={<SvgImage name="Photo" />}
                    label={t('feature.chat.view-shared-media')}
                    onPress={() => console.info('not implemented')}
                />
                <SettingsItem
                    disabled
                    image={<SvgImage name="Cash" />}
                    label={t('words.payments')}
                    onPress={() => console.info('not implemented')}
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
