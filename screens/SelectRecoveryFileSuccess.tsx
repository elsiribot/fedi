import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { Text, Theme, useTheme } from '@rneui/themed'

import type { RootStackParamList } from '../types/navigation'
import Success from '../components/ui/Success'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'SelectRecoveryFileSuccess'
>

const SelectRecoveryFileSuccess: React.FC<Props> = ({ route }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { fileName } = route.params

    return (
        <Success
            message={
                <View style={styles(theme).textContainer}>
                    <Text h3 h3Style={styles(theme).successMessage}>
                        {t('feature.recovery.successfully-opened-fedi-file')}
                    </Text>
                    <Text h4 h4Style={styles(theme).fileNameText}>
                        {fileName}
                    </Text>
                </View>
            }
            buttonText={t('words.okay')}
            nextScreen={'CompleteSocialRecovery'}
        />
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        textContainer: {
            marginVertical: theme.spacing.lg,
            width: '80%',
            alignItems: 'center',
        },
        successMessage: {
            textAlign: 'center',
            marginBottom: theme.spacing.lg,
        },
        fileNameText: {
            fontWeight: '400',
        },
    })

export default SelectRecoveryFileSuccess
