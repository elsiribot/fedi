import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import { Text, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable } from 'react-native'

import { NavigationHook, RootStackParamList } from '../../../types/navigation'
import Header from '../../ui/Header'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'

type GroupAdminRouteProp = RouteProp<RootStackParamList, 'GroupAdmin'>

const GroupInviteHeader: React.FC<{}> = () => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const route = useRoute<GroupAdminRouteProp>()
    const { group } = route.params

    return (
        <Header
            dark
            headerLeft={
                <Pressable
                    onPress={() => navigation.goBack()}
                    hitSlop={5}
                    style={{
                        padding: theme.spacing.sm,
                    }}>
                    <SvgImage
                        name="ChevronLeft"
                        color={theme.colors.secondary}
                    />
                </Pressable>
            }
            headerCenter={
                <Text bold style={{ color: theme.colors.secondary }}>
                    {t('feature.chat.group-invite')}
                </Text>
            }
            headerRight={
                <Pressable
                    onPress={() => {
                        // TODO: implement EditGroup
                        console.info('TODO: implement EditGroup', group)
                        // navigation.navigate('EditGroup', { group })
                    }}
                    disabled
                    style={{
                        padding: theme.spacing.sm,
                        // Disabled
                        opacity: 0.25,
                    }}>
                    <SvgImage name="Edit" size={SvgImageSize.md} />
                </Pressable>
            }
        />
    )
}

export default GroupInviteHeader
