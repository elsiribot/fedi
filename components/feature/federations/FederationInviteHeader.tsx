import { useNavigation } from '@react-navigation/native'
import { Icon, Text, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable } from 'react-native'

import { NavigationHook } from '../../../types/navigation'
import Header from '../../ui/Header'

const FederationInviteHeader: React.FC<{}> = () => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()

    return (
        <Header
            backgroundColor={theme.colors.primary}
            containerStyle={{
                borderBottomColor: theme.colors.primary,
            }}
            headerCenter={
                <Text bold style={{ color: theme.colors.secondary }}>
                    {t('feature.federations.federation-invite')}
                </Text>
            }
            centerContainerStyle={{
                borderBottomColor: theme.colors.primary,
            }}
            headerRight={
                <Pressable
                    onPress={() => navigation.replace('Home')}
                    style={{
                        padding: theme.spacing.sm,
                    }}>
                    <Icon name={'close'} color={theme.colors.secondary} />
                </Pressable>
            }
        />
    )
}

export default FederationInviteHeader
