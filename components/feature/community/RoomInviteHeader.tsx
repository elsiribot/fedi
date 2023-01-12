import { useNavigation } from '@react-navigation/native'
import { Image, Text, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable } from 'react-native'
import { Images } from '../../../assets/images'

import { NavigationHook } from '../../../types/navigation'
import Header from '../../ui/Header'

const RoomInviteHeader: React.FC<{}> = () => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()

    return (
        <Header
            backgroundColor={theme.colors.primary}
            containerStyle={{
                borderBottomColor: theme.colors.primary,
            }}
            backButton
            headerCenter={
                <Text bold style={{ color: theme.colors.secondary }}>
                    {t('feature.community.room-invite')}
                </Text>
            }
            headerRight={
                <Pressable
                    onPress={() => navigation.navigate('EditRoom')}
                    style={{
                        padding: theme.spacing.sm,
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

export default RoomInviteHeader
