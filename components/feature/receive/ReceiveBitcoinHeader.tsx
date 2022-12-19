import React from 'react'
import { Text } from '@rneui/themed'
import { useTranslation } from 'react-i18next'

import Header from '../../ui/Header'

const ReceiveBitcoinHeader: React.FC<{}> = () => {
    const { t } = useTranslation()

    return (
        <Header
            backButton
            centerContainerStyle={{ flex: 3 }}
            headerCenter={
                <Text bold>{t('feature.receive.request-bitcoin')}</Text>
            }
        />
    )
}

export default ReceiveBitcoinHeader
