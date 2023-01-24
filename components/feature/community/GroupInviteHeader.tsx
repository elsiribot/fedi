import { useNavigation } from '@react-navigation/native'
import { Icon, Image, Text, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable } from 'react-native'
import { Images } from '../../../assets/images'

import { NavigationHook } from '../../../types/navigation'
import Header from '../../ui/Header'

const GroupInviteHeader: React.FC<{}> = () => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()

    return (
        <Header
            backgroundColor={theme.colors.primary}
            containerStyle={{
                borderBottomColor: theme.colors.primary,
            }}
            headerLeft={
                <Pressable
                    onPress={() => navigation.goBack()}
                    style={{
                        padding: theme.spacing.sm,
                    }}>
                    <Icon
                        name={'angle-left'}
                        type="font-awesome"
                        color={theme.colors.secondary}
                    />
                </Pressable>
            }
            headerCenter={
                <Text bold style={{ color: theme.colors.secondary }}>
                    {t('feature.community.group-invite')}
                </Text>
            }
            headerRight={
                <Pressable
                    // onPress={() => navigation.navigate('EditGroup')}
                    disabled
                    style={{
                        padding: theme.spacing.sm,
                        // Disabled
                        opacity: 0.25,
                    }}>
                    <Image
                        style={{
                            height: theme.sizes.md,
                            width: theme.sizes.md,
                        }}
                        source={Images.Edit}
                    />
                </Pressable>
            }
        />
    )
}

export default GroupInviteHeader
