import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { TouchableOpacity } from 'react-native'
import { Icon, Text } from '@rneui/themed'
import { useTranslation } from 'react-i18next'

import Header from '../../ui/Header'

const ChooseRecoveryMethodHeader: React.FC<{}> = () => {
    const { t } = useTranslation()
    const navigation = useNavigation()

    return (
        <Header
            headerLeft={
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name={'angle-left'} type="font-awesome" />
                </TouchableOpacity>
            }
            headerCenter={<Text h4>{t('feature.recovery.choose-method')}</Text>}
            centerContainerStyle={{ flex: 4 }}
        />
    )
}

export default ChooseRecoveryMethodHeader
