import { useNavigation, useRoute } from '@react-navigation/native'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { Props as GroupChatProps } from '../../../screens/GroupChat'
import { NavigationHook } from '../../../types/navigation'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'

type GroupChatRouteProp = GroupChatProps['route']

const EmptyGroupNotice: React.FC<{}> = () => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const route = useRoute<GroupChatRouteProp>()
    const { group } = route.params

    return (
        <View style={styles(theme).container}>
            <SvgImage
                name="Search"
                size={SvgImageSize.lg}
                containerStyle={{
                    marginTop: theme.spacing.xl,
                    paddingTop: theme.spacing.xl,
                    paddingBottom: theme.spacing.md,
                }}
                svgProps={{
                    stroke: theme.colors.primaryLight,
                }}
            />
            <Text medium style={styles(theme).text}>
                {t('feature.community.no-one-is-in-this-group')}
            </Text>
            <Text medium style={styles(theme).text}>
                {t('feature.community.try-inviting-someone')}
            </Text>
            <Button
                containerStyle={styles(theme).button}
                title={t('feature.community.invite-to-group')}
                onPress={() => navigation.navigate('GroupInvite', { group })}
                titleStyle={styles(theme).buttonTitle}
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
        buttonTitle: {
            fontFamily: 'AlbertSans-Regular',
        },
    })

export default EmptyGroupNotice
