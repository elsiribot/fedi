import React from 'react'
import { View, ViewStyle } from 'react-native'
import { Header as HeaderRNE, useTheme } from '@rneui/themed'

type HeaderProps = {
    headerLeft?: React.ReactNode
    headerCenter?: React.ReactNode
    headerRight?: React.ReactNode
    leftContainerStyle?: ViewStyle
    centerContainerStyle?: ViewStyle
    rightContainerStyle?: ViewStyle
    containerStyle?: ViewStyle
    backgroundColor?: string
}

const Header: React.FC<HeaderProps> = ({
    headerLeft,
    headerCenter,
    headerRight,
    leftContainerStyle,
    centerContainerStyle,
    rightContainerStyle,
    containerStyle,
    backgroundColor,
}: HeaderProps) => {
    const { theme } = useTheme()

    return (
        <HeaderRNE
            backgroundColor={
                backgroundColor ? backgroundColor : theme.colors.secondary
            }
            centerComponent={<View>{headerCenter || null}</View>}
            leftComponent={<View>{headerLeft || null}</View>}
            rightComponent={<View>{headerRight || null}</View>}
            {...(leftContainerStyle ? { leftContainerStyle } : {})}
            {...(centerContainerStyle ? { centerContainerStyle } : {})}
            {...(rightContainerStyle ? { rightContainerStyle } : {})}
            {...(containerStyle ? { containerStyle } : {})}
        />
    )
}

export default Header
