import { Text } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'

import Header from '../../ui/Header'

const BitcoinRequestHeader: React.FC<{}> = () => {
    const { t } = useTranslation()

    return (
        <Header
            backButton
            headerCenter={
                <Text bold>
                    {t('feature.receive.create-lightning-request')}
                </Text>
            }
            closeButton
        />
    )
}

export default BitcoinRequestHeader
