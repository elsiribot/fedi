import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import HoloLoader from '../../ui/HoloLoader'

export type Props = {
    label?: string
}

const RecoveryInProgress: React.FC<Props> = ({ label }: Props) => {
    const { theme } = useTheme()

    const style = styles(theme)
    return (
        <View style={style.container}>
            <HoloLoader size={100} />
            {label && (
                <Text medium style={style.label}>
                    {label}
                </Text>
            )}
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: theme.spacing.lg,
            gap: theme.spacing.lg,
        },
        label: {
            textAlign: 'center',
        },
    })

export default RecoveryInProgress
