import { Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

import Flex from '../../ui/Flex'

export const OrDivider: React.FC = () => {
    const { theme } = useTheme()
    const style = styles(theme)

    return (
        <Flex row align="center" gap="lg" style={style.container}>
            <View style={style.line} />
            <Text style={style.text}>or</Text>
            <View style={style.line} />
        </Flex>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            width: '100%',
            marginVertical: 0,
        },
        line: {
            flex: 1,
            height: 1,
            backgroundColor: theme.colors.extraLightGrey,
        },
        text: {
            // no more manual margins needed!
            color: theme.colors.grey,
            fontWeight: '600',
        },
    })
