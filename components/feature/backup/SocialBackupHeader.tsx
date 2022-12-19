import React from 'react'
import { Text } from '@rneui/themed'
import { useTranslation } from 'react-i18next'

import Header from '../../ui/Header'

type SocialBackupHeaderProps = {
    backButton?: boolean
    closeButton?: boolean
}

const SocialBackupHeader: React.FC<SocialBackupHeaderProps> = ({
    backButton = false,
    closeButton = false,
}: SocialBackupHeaderProps) => {
    const { t } = useTranslation()

    return (
        <Header
            backButton={backButton}
            headerCenter={<Text bold>{t('feature.backup.social-backup')}</Text>}
            centerContainerStyle={{ flex: 3 }}
            closeButton={closeButton}
        />
    )
}

export default SocialBackupHeader
