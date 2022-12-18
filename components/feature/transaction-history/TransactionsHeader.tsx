import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { TouchableOpacity } from 'react-native'
import { Icon, Text } from '@rneui/themed'
import { useTranslation } from 'react-i18next'

import Header from '../../ui/Header'

const TransactionsHeader: React.FC<{}> = () => {
    const { t } = useTranslation()
    const navigation = useNavigation()

    return (
        <Header
            headerCenter={<Text bold>{t('words.transactions')}</Text>}
            centerContainerStyle={{ flex: 3 }}
            headerRight={
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name={'close'} />
                </TouchableOpacity>
            }
        />
    )
}

export default TransactionsHeader
