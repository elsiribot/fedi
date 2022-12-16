import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { TouchableOpacity } from 'react-native'
import { Icon, Text } from '@rneui/themed'
import { useTranslation } from 'react-i18next'

import Header from '../../ui/Header'

type RecoveryAssistHeaderProps = {
    backButton?: boolean
    closeButton?: boolean
}

const RecoveryAssistHeader: React.FC<RecoveryAssistHeaderProps> = ({
    backButton,
    closeButton,
}: RecoveryAssistHeaderProps) => {
    const { t } = useTranslation()
    const navigation = useNavigation()

    return (
        <Header
            headerCenter={
                <Text h4>{t('feature.recovery.recovery-assist')}</Text>
            }
            centerContainerStyle={{ flex: 3 }}
            {...(backButton
                ? {
                      headerLeft: (
                          <TouchableOpacity onPress={() => navigation.goBack()}>
                              <Icon name={'angle-left'} type="font-awesome" />
                          </TouchableOpacity>
                      ),
                  }
                : {})}
            {...(closeButton
                ? {
                      headerRight: (
                          <TouchableOpacity
                              onPress={() => navigation.navigate('Home')}>
                              <Icon name={'close'} />
                          </TouchableOpacity>
                      ),
                  }
                : {})}
        />
    )
}

export default RecoveryAssistHeader
