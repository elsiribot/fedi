import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { TouchableOpacity } from 'react-native'
import { Icon, Text } from '@rneui/themed'
import { useTranslation } from 'react-i18next'

import Header from '../../ui/Header'

type SocialRecoveryHeaderProps = {
    backButton?: boolean
    closeButton?: boolean
}

const SocialRecoveryHeader: React.FC<SocialRecoveryHeaderProps> = ({
    backButton,
    closeButton,
}: SocialRecoveryHeaderProps) => {
    const { t } = useTranslation()
    const navigation = useNavigation()

    return (
        <Header
            headerCenter={
                <Text h4>{t('feature.recovery.social-recovery')}</Text>
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

export default SocialRecoveryHeader
