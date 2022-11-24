import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { Button } from '@rneui/themed'

import type { HomeTabsParamList } from './Home'
import type { RootStackParamList } from '../Router'

export type Props = BottomTabScreenProps<
    HomeTabsParamList & RootStackParamList,
    'Settings'
>

const Settings: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()

    return (
        <View style={styles.container}>
            <Button
                title={t('words.backup')}
                onPress={() => navigation.navigate('Backup')}
            />
        </View>
    )
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-evenly',
    },
})

export default Settings
