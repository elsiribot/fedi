import React from 'react'
import { Pressable, View, ViewStyle } from 'react-native'
import { Header as HeaderRNE, Icon, useTheme } from '@rneui/themed'
import { useNavigation } from '@react-navigation/native'
import { NavigationHook } from '../../types/navigation'

interface HeaderBase {
    headerLeft?: React.ReactNode
    headerCenter?: React.ReactNode
    headerRight?: React.ReactNode
    leftContainerStyle?: ViewStyle
    centerContainerStyle?: ViewStyle
    rightContainerStyle?: ViewStyle
    containerStyle?: ViewStyle
    backgroundColor?: string
    backButton?: boolean
    closeButton?: boolean
}

interface HeaderWithBackButton extends HeaderBase {
    headerLeft: React.ReactNode
    backButton?: never
}

interface HeaderWithCloseButton extends HeaderBase {
    headerRight: React.ReactNode
    closeButton?: never
}

type HeaderProps = HeaderBase | HeaderWithBackButton | HeaderWithCloseButton

const Header: React.FC<HeaderProps> = ({
    headerLeft,
    headerCenter,
    headerRight,
    leftContainerStyle,
    centerContainerStyle,
    rightContainerStyle,
    containerStyle = {},
    backgroundColor,
    backButton,
    closeButton,
}: HeaderProps) => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()

    // This style is reserved for anything that should always be on the container
    // They will be merged with any incoming containerStyle props and therefore
    // can only be expicitly overriden by the same CSS rule inside containerStyle
    const DEFAULT_REQUIRED_CONTAINER_STYLES = {
        // This helps maximize the clickable area for any header buttons
        paddingBottom: 0,
    }
    const mergedContainerStyle = {
        ...DEFAULT_REQUIRED_CONTAINER_STYLES,
        containerStyle,
    }

    // This logic allows for custom UI in the left side of the Header
    // but the backButton prop overrides any custom headerLeft component
    let leftComponent = <View>{headerLeft || null}</View>
    if (backButton) {
        leftComponent = (
            <Pressable
                onPress={() => navigation.goBack()}
                style={{
                    padding: theme.spacing.xs,
                }}>
                <Icon name={'angle-left'} type="font-awesome" />
            </Pressable>
        )
    }

    // This logic allows for custom UI in the right side of the Header
    // but the closeButton prop overrides any custom headerRight component
    let rightComponent = <View>{headerRight || null}</View>
    if (closeButton) {
        rightComponent = (
            <Pressable
                onPress={() => navigation.replace('Home')}
                style={{
                    padding: theme.spacing.xs,
                }}>
                <Icon name={'close'} />
            </Pressable>
        )
    }

    return (
        <HeaderRNE
            backgroundColor={
                backgroundColor ? backgroundColor : theme.colors.secondary
            }
            containerStyle={mergedContainerStyle}
            centerComponent={<View>{headerCenter || null}</View>}
            leftComponent={leftComponent}
            rightComponent={rightComponent}
            {...(leftContainerStyle ? { leftContainerStyle } : {})}
            {...(centerContainerStyle ? { centerContainerStyle } : {})}
            {...(rightContainerStyle ? { rightContainerStyle } : {})}
        />
    )
}

export default Header
