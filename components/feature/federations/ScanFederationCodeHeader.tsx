import { Text } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'

import Header from '../../ui/Header'

const ScanFederationCodeHeader: React.FC<{}> = () => {
    const { t } = useTranslation()

    return (
        <Header
            backButton
            headerCenter={
                <Text bold>
                    {t('feature.federations.scan-federation-invite')}
                </Text>
            }
            centerContainerStyle={{
                flex: 3,
            }}
        />
    )
}

export default ScanFederationCodeHeader
