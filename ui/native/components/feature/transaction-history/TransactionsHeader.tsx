import { useNavigation } from '@react-navigation/native'
import { Text, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable } from 'react-native'

import Header from '../../ui/Header'
import SvgImage from '../../ui/SvgImage'

const TransactionsHeader: React.FC = () => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const navigation = useNavigation()

    return (
        <Header
            headerCenter={
                <Text bold numberOfLines={1} adjustsFontSizeToFit>
                    {t('words.transactions')}
                </Text>
            }
            headerRight={
                <Pressable
                    onPress={() => navigation.goBack()}
                    hitSlop={5}
                    style={{
                        padding: theme.spacing.sm,
                    }}>
                    <SvgImage name="Close" />
                </Pressable>
            }
        />
    )
}

export default TransactionsHeader
