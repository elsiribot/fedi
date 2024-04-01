import { useNavigation, useRoute } from '@react-navigation/native'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { Props as GroupChatProps } from '../../../screens/GroupChat'
import { NavigationHook } from '../../../types/navigation'

type GroupChatRouteProp = GroupChatProps['route']

type Props = {
    isBroadcast?: boolean
}

const NoMembersNotice: React.FC = ({ isBroadcast = false }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const route = useRoute<GroupChatRouteProp>()
    const { groupId } = route.params

    return (
        <View style={styles(theme).container}>
            {isBroadcast ? (
                <Text medium style={styles(theme).text}>
                    {t('feature.chat.broadcast-no-message')}
                </Text>
            ) : (
                <Text medium style={styles(theme).text}>
                    {t('feature.chat.no-one-is-in-this-group')}
                    {'\r'}
                    {t('feature.chat.try-inviting-someone')}
                </Text>
            )}
            <Button
                containerStyle={styles(theme).button}
                title={t('feature.chat.invite-to-group')}
                onPress={() => navigation.navigate('GroupInvite', { groupId })}
            />
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
        icon: {
            height: theme.sizes.lg,
            width: theme.sizes.lg,
            marginTop: theme.spacing.xl,
            paddingTop: theme.spacing.xl,
            marginBottom: theme.spacing.md,
        },
        text: {
            maxWidth: 320,
            color: theme.colors.grey,
            textAlign: 'center',
            lineHeight: 20,
            fontFamily: 'AlbertSans',
            letterSpacing: 0.5,
            paddingHorizontal: theme.spacing.xl,
        },
        button: {
            marginTop: theme.spacing.lg,
            width: '80%',
        },
    })

export default NoMembersNotice
