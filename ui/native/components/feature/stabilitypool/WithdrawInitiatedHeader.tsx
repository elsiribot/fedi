import { Text } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'

import Header from '../../ui/Header'

const WithdrawInitiatedHeader: React.FC<{}> = () => {
    const { t } = useTranslation()

    return (
        <Header
            backButton
            headerCenter={
                <Text bold>
                    {t('feature.stabilitypool.withdrawal-intiated')}
                </Text>
            }
        />
    )
}

export default WithdrawInitiatedHeader
