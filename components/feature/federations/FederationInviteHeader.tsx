import { useNavigation } from '@react-navigation/native'
import { Icon, Text, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { TouchableOpacity } from 'react-native'

import Header from '../../ui/Header'

const FederationInviteHeader: React.FC<{}> = () => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const navigation = useNavigation()

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
                flex: 3,
                borderBottomColor: theme.colors.primary,
            }}
            headerRight={
                <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                    <Icon name={'close'} color={theme.colors.secondary} />
                </TouchableOpacity>
            }
        />
    )
}

export default FederationInviteHeader
