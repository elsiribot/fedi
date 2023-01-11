import { Text } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'

import Header from '../../ui/Header'

type SocialRecoveryHeaderProps = {
    backButton?: boolean
    closeButton?: boolean
}

const SocialRecoveryHeader: React.FC<SocialRecoveryHeaderProps> = ({
    backButton = false,
    closeButton = false,
}: SocialRecoveryHeaderProps) => {
    const { t } = useTranslation()

    return (
        <Header
            backButton={backButton}
            headerCenter={
                <Text bold>{t('feature.recovery.social-recovery')}</Text>
            }
            closeButton={closeButton}
        />
    )
}

export default SocialRecoveryHeader
