import React from 'react'
import { Text } from '@rneui/themed'
import { useTranslation } from 'react-i18next'

import Header from '../../ui/Header'

const ChooseRecoveryMethodHeader: React.FC<{}> = () => {
    const { t } = useTranslation()

    return (
        <Header
            backButton
            headerCenter={
                <Text bold>{t('feature.recovery.choose-method')}</Text>
            }
            centerContainerStyle={{ flex: 4 }}
        />
    )
}

export default ChooseRecoveryMethodHeader
