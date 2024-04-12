import { Text } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { usePin, useProtectedFeature } from '../../../utils/hooks/security'
import Header from '../../ui/Header'

const SetPinHeader: React.FC = () => {
    const { t } = useTranslation()
    const pin = usePin()
    const isUnlocked = useProtectedFeature('changePin', pin.status === 'set')

    // Renders `null` if not unlocked (or pin unset) to prevent flickering
    return isUnlocked || pin.status === 'unset' ? (
        <Header
            backButton
            headerCenter={
                <Text bold numberOfLines={1} adjustsFontSizeToFit>
                    {t('feature.pin.create-new-pin')}
                </Text>
            }
        />
    ) : null
}

export default SetPinHeader
