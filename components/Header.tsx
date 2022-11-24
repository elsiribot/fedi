import React from 'react'
import { TouchableOpacity, View } from 'react-native'
import { Header as HeaderRNE, Icon, Text, useTheme } from '@rneui/themed'

type HeaderButton = {
    icon: string
    onPress: () => void
}

type HeaderProps = {
    headerLeft?: HeaderButton
    title: string
    headerRight?: HeaderButton
}

const Header: React.FC<HeaderProps> = ({
    headerLeft,
    title,
    headerRight,
}: HeaderProps) => {
    const { theme } = useTheme()

    return (
        <HeaderRNE
            backgroundColor={theme.colors.secondary}
            centerComponent={<Text>{title}</Text>}
            leftComponent={
                <View>
                    {headerLeft && (
                        <TouchableOpacity onPress={headerLeft.onPress}>
                            <Icon name={headerLeft.icon} />
                        </TouchableOpacity>
                    )}
                </View>
            }
            rightComponent={
                <View>
                    {headerRight && (
                        <TouchableOpacity onPress={headerRight.onPress}>
                            <Icon name={headerRight.icon} />
                        </TouchableOpacity>
                    )}
                </View>
            }
        />
    )
}

export default Header
