import { useNavigation } from '@react-navigation/native'
import { Header as HeaderRNE, Icon, useTheme } from '@rneui/themed'
import React from 'react'
import { Pressable, ViewStyle } from 'react-native'

import { reset } from '../../state/navigation'
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
    leftContainerStyle = {},
    centerContainerStyle = {},
    rightContainerStyle = {},
    containerStyle = {},
    backgroundColor,
    backButton,
    closeButton,
}: HeaderProps) => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()

    // This logic allows for custom UI in the left side of the Header
    // but the backButton prop overrides any custom headerLeft component
    let leftComponent = <>{headerLeft || null}</>
    if (backButton) {
        leftComponent = (
            <Pressable
                onPress={() => navigation.goBack()}
                hitSlop={5}
                style={{
                    padding: theme.spacing.sm,
                }}>
                <Icon name={'angle-left'} type="font-awesome" />
            </Pressable>
        )
    }

    // This logic allows for custom UI in the right side of the Header
    // but the closeButton prop overrides any custom headerRight component
    let rightComponent = <>{headerRight || null}</>
    if (closeButton) {
        rightComponent = (
            <Pressable
                onPress={() => navigation.dispatch(reset('TabsNavigator'))}
                hitSlop={5}
                style={{
                    padding: theme.spacing.xs,
                }}>
                <Icon name={'close'} />
            </Pressable>
        )
    }

    // Merge default container styles defined in theme with prop overrides
    const {
        leftContainerStyle: defaultLeftContainerStyle,
        centerContainerStyle: defaultCenterContainerStyle,
        rightContainerStyle: defaultRightContainerStyle,
        containerStyle: defaultContainerStyle,
    } = theme.components.Header
    const mergedLeftContainerStyle = {
        ...defaultLeftContainerStyle,
        ...leftContainerStyle,
    }
    const mergedCenterContainerStyle = {
        ...defaultCenterContainerStyle,
        ...centerContainerStyle,
    }
    const mergedRightContainerStyle = {
        ...defaultRightContainerStyle,
        ...rightContainerStyle,
    }
    const mergedContainerStyle = {
        ...defaultContainerStyle,
        ...containerStyle,
    }

    return (
        <HeaderRNE
            backgroundColor={
                backgroundColor ? backgroundColor : theme.colors.secondary
            }
            containerStyle={mergedContainerStyle}
            centerComponent={<>{headerCenter || null}</>}
            leftComponent={leftComponent}
            rightComponent={rightComponent}
            leftContainerStyle={mergedLeftContainerStyle}
            centerContainerStyle={mergedCenterContainerStyle}
            rightContainerStyle={mergedRightContainerStyle}
        />
    )
}

export default Header
