import React from 'react'
import { Text } from '@rneui/themed'
import { useTranslation } from 'react-i18next'

import Header from '../../ui/Header'

const SendBitcoinHeader: React.FC<{}> = () => {
    const { t } = useTranslation()

    return (
        <Header
            backButton
            headerCenter={<Text bold>{t('feature.send.send-bitcoin')}</Text>}
            centerContainerStyle={{
                flex: 3,
            }}
            closeButton
        />
    )
}

export default SendBitcoinHeader
