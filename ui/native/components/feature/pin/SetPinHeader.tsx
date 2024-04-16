import { Text } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'

import Header from '../../ui/Header'

const SetPinHeader: React.FC = () => {
    const { t } = useTranslation()

    // Renders `null` if not unlocked (or pin unset) to prevent flickering
    return (
        <Header
            backButton
            headerCenter={
                <Text bold numberOfLines={1} adjustsFontSizeToFit>
                    {t('feature.pin.create-new-pin')}
                </Text>
            }
        />
    )
}

export default SetPinHeader
