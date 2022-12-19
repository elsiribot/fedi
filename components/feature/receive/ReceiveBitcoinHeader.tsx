import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { TouchableOpacity } from 'react-native'
import { Icon, Text, useTheme } from '@rneui/themed'
import { useTranslation } from 'react-i18next'

import Header from '../../ui/Header'

const ReceiveBitcoinHeader: React.FC<{}> = () => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const navigation = useNavigation()

    return (
        <Header
            centerContainerStyle={{ flex: 3 }}
            headerCenter={
                <Text bold>{t('feature.receive.receive-bitcoin')}</Text>
            }
            headerRight={
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{
                        backgroundColor: 'yellow',
                        padding: theme.spacing.xs,
                    }}>
                    <Icon name={'close'} />
                </TouchableOpacity>
            }
        />
    )
}

export default ReceiveBitcoinHeader
