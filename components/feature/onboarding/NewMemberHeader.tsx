import { Text } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'

import Header from '../../ui/Header'

const NewMemberHeader: React.FC<{}> = () => {
    const { t } = useTranslation()

    return (
        <Header
            backButton
            headerCenter={<Text bold>{t('phrases.new-member')}</Text>}
            centerContainerStyle={{
                flex: 3,
            }}
        />
    )
}

export default NewMemberHeader
