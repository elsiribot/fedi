import { Text } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'

import Header from '../../ui/Header'

const ReceiveBitcoinOfflineHeader: React.FC<{}> = () => {
    const { t } = useTranslation()

    return (
        <Header
            backButton
            headerCenter={
                <Text bold>{t('feature.receive.receive-bitcoin-offline')}</Text>
            }
            closeButton
        />
    )
}

export default ReceiveBitcoinOfflineHeader
