import { Text } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'

import Header from '../../ui/Header'

const SettingsHeader: React.FC<{}> = () => {
    const { t } = useTranslation()

    return (
        <Header
            leftContainerStyle={{ flex: 6 }}
            headerLeft={
                <Text h2 medium>
                    {t('words.settings')}
                </Text>
            }
            closeButton
        />
    )
}

export default SettingsHeader
