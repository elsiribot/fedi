import { Text } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'

import Header from '../../ui/Header'

const JoinGroupHeader: React.FC<{}> = () => {
    const { t } = useTranslation()

    return (
        <Header
            headerCenter={
                <Text bold>{t('feature.community.join-a-group')}</Text>
            }
            closeButton
        />
    )
}

export default JoinGroupHeader
