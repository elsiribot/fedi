import { useNavigation, useRoute } from '@react-navigation/native'
import { Button, Image, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { Images } from '../../../assets/images'
import { Props as RoomChatProps } from '../../../screens/RoomChat'
import { NavigationHook } from '../../../types/navigation'

type RoomChatRouteProp = RoomChatProps['route']

const EmptyRoomNotice: React.FC<{}> = () => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const route = useRoute<RoomChatRouteProp>()
    const { room } = route.params

    return (
        <View style={styles(theme).container}>
            <Image style={styles(theme).icon} source={Images.Search} />
            <Text medium style={styles(theme).text}>
                {t('feature.community.no-one-is-in-this-room')}
            </Text>
            <Text medium style={styles(theme).text}>
                {t('feature.community.try-inviting-someone')}
            </Text>
            <Button
                containerStyle={styles(theme).button}
                title={t('feature.community.invite-to-room')}
                onPress={() => navigation.navigate('RoomInvite', { room })}
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
            paddingTop: theme.spacing.xxl,
            marginTop: theme.spacing.xxl,
        },
        icon: {
            height: theme.sizes.lg,
            width: theme.sizes.lg,
            marginTop: theme.spacing.xl,
            paddingTop: theme.spacing.xl,
            marginBottom: theme.spacing.md,
        },
        text: {
            color: theme.colors.primaryLight,
            textAlign: 'center',
            marginVertical: theme.spacing.xs,
        },
        button: {
            marginTop: theme.spacing.lg,
            width: '80%',
        },
    })

export default EmptyRoomNotice
