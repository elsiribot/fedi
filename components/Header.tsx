import React from 'react'
import { View } from 'react-native'
import { Header as HeaderRNE, useTheme } from '@rneui/themed'

type HeaderProps = {
    headerLeft?: React.ReactNode
    headerCenter?: React.ReactNode
    headerRight?: React.ReactNode
}

const Header: React.FC<HeaderProps> = ({
    headerLeft,
    headerCenter,
    headerRight,
}: HeaderProps) => {
    const { theme } = useTheme()

    return (
        <HeaderRNE
            backgroundColor={theme.colors.secondary}
            centerComponent={<View>{headerCenter || null}</View>}
            leftComponent={<View>{headerLeft || null}</View>}
            rightComponent={<View>{headerRight || null}</View>}
        />
    )
}

export default Header
