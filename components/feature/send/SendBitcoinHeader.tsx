import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { TouchableOpacity } from 'react-native'
import { Icon, Text } from '@rneui/themed'
import { useTranslation } from 'react-i18next'

import Header from '../../ui/Header'

const SendBitcoinHeader: React.FC<{}> = () => {
    const { t } = useTranslation()
    const navigation = useNavigation()

    return (
        <Header
            headerLeft={
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name={'angle-left'} type="font-awesome" />
                </TouchableOpacity>
            }
            headerCenter={<Text bold>{t('feature.send.send-bitcoin')}</Text>}
            centerContainerStyle={{
                flex: 3,
            }}
            headerRight={
                <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                    <Icon name={'close'} />
                </TouchableOpacity>
            }
        />
    )
}

export default SendBitcoinHeader
