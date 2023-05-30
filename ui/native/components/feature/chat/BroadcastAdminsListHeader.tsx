import { Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { StyleSheet } from 'react-native'

import Header from '../../ui/Header'

const BroadcastAdminsListHeader: React.FC<{}> = () => {
    const { theme } = useTheme()

    return <Header backButton containerStyle={styles(theme).container} />
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {},
    })

export default BroadcastAdminsListHeader
