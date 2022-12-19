import React from 'react'
import { Text } from '@rneui/themed'
import { useTranslation } from 'react-i18next'

import Header from '../../ui/Header'

const ChooseBackupMethodHeader: React.FC<{}> = () => {
    const { t } = useTranslation()

    return (
        <Header
            backButton
            headerCenter={<Text bold>{t('feature.backup.choose-method')}</Text>}
            centerContainerStyle={{ flex: 3 }}
        />
    )
}

export default ChooseBackupMethodHeader
