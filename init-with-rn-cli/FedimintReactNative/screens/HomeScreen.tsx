import React from 'react'
import { useTranslation } from 'react-i18next'
import { View, Text, Button } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../App'

export type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

const HomeScreen: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()

    return (
        <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text>{t('words.fedimint')}</Text>
            <Text>{`Home`}</Text>
            <Button
                title="Go to Pay"
                onPress={() => navigation.navigate('Pay')}
            />
        </View>
    )
}

export default HomeScreen
