import { useNavigation } from '@react-navigation/native'
import { Theme, useTheme } from '@rneui/themed'
import { useCallback } from 'react'
import { StyleSheet } from 'react-native'

import { NavigationHook } from '../../types/navigation'
import HeaderAvatar from '../feature/chat/HeaderAvatar'
import Flex from './Flex'
import { PressableIcon } from './PressableIcon'

type Props = {
    onAddPress: () => void
}

const MainHeaderButtons: React.FC<Props> = ({ onAddPress }) => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()

    const style = styles(theme)

    const openOmniScanner = useCallback(() => {
        return navigation.navigate('OmniScanner')
    }, [navigation])

    const openSettings = useCallback(() => {
        return navigation.navigate('Settings')
    }, [navigation])

    return (
        <Flex row align="center" gap="md">
            {/* TODO: add gradients to bubbleButton styling to match designs */}
            {onAddPress && (
                <PressableIcon
                    containerStyle={style.bubbleButton}
                    onPress={onAddPress}
                    hitSlop={5}
                    svgName="Plus"
                    svgProps={{ size: 16 }}
                />
            )}
            <PressableIcon
                containerStyle={style.bubbleButton}
                onPress={openOmniScanner}
                hitSlop={5}
                svgName="Scan"
                svgProps={{ size: 16 }}
            />
            <HeaderAvatar testID="AvatarButton" onPress={openSettings} />
        </Flex>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            paddingBottom: theme.spacing.md,
            justifyContent: 'space-between',
        },
        centerContainer: {
            maxWidth: '80%',
        },
        nightly: {
            position: 'absolute',
            bottom: 0,
            right: theme.spacing.lg,
            backgroundColor: theme.colors.primary,
            paddingHorizontal: theme.spacing.sm,
            borderTopLeftRadius: 5,
            borderTopRightRadius: 5,
        },
        nightlyText: {
            fontSize: 10,
            color: theme.colors.secondary,
        },
        bubbleButton: {
            height: theme.sizes.bubbleButtonSize,
            width: theme.sizes.bubbleButtonSize,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.secondary,
            borderWidth: 1.5,
            borderColor: theme.colors.lightGrey,
            borderRadius: theme.sizes.bubbleButtonSize * 2,
        },
    })

export default MainHeaderButtons
