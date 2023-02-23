import { Text } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'

import Header from '../../ui/Header'

const AdminHeader: React.FC<{}> = () => {
    const { t } = useTranslation()

    return (
        <Header
            leftContainerStyle={{ flex: 6 }}
            headerLeft={
                <Text h2 medium>
                    {t('words.admin')}
                </Text>
            }
        />
    )
}

export default AdminHeader
