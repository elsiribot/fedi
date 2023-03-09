import { useNavigation } from '@react-navigation/native'
import { Icon, Text, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable } from 'react-native'

import Header from '../../ui/Header'

const TransactionsHeader: React.FC<{}> = () => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const navigation = useNavigation()

    return (
        <Header
            headerCenter={<Text bold>{t('words.transactions')}</Text>}
            headerRight={
                <Pressable
                    onPress={() => navigation.goBack()}
                    hitSlop={5}
                    style={{
                        padding: theme.spacing.sm,
                    }}>
                    <Icon name={'close'} />
                </Pressable>
            }
        />
    )
}

export default TransactionsHeader
