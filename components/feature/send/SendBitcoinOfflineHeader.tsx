import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { TouchableOpacity } from 'react-native'
import { Icon, Text } from '@rneui/themed'
import { useTranslation } from 'react-i18next'

import Header from '../../ui/Header'

const SendBitcoinOfflineHeader: React.FC<{}> = () => {
    const { t } = useTranslation()
    const navigation = useNavigation()

    return (
        <Header
            backButton
            headerCenter={
                <Text bold>{t('feature.send.send-bitcoin-offline')}</Text>
            }
            centerContainerStyle={{
                flex: 3,
            }}
            closeButton
        />
    )
}

export default SendBitcoinOfflineHeader
