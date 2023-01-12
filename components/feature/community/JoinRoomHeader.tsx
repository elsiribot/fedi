import { Text } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'

import Header from '../../ui/Header'

const JoinRoomHeader: React.FC<{}> = () => {
    const { t } = useTranslation()

    return (
        <Header
            headerCenter={
                <Text bold>{t('feature.community.join-a-room')}</Text>
            }
            closeButton
        />
    )
}

export default JoinRoomHeader
