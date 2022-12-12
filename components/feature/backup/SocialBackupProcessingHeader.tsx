import React from 'react'
import { Text } from '@rneui/themed'
import { useTranslation } from 'react-i18next'

import Header from '../../ui/Header'

const SocialBackupProcessingHeader: React.FC<{}> = () => {
    const { t } = useTranslation()

    return (
        <Header
            headerCenter={<Text h4>{t('feature.backup.social-backup')}</Text>}
            centerContainerStyle={{ flex: 3 }}
        />
    )
}

export default SocialBackupProcessingHeader
