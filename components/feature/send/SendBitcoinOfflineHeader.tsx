import { Text } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'

import Header from '../../ui/Header'

const SendBitcoinOfflineHeader: React.FC<{}> = () => {
    const { t } = useTranslation()

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
