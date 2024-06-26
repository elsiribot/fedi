import { Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { selectMatrixAuth } from '@fedi/common/redux'

import { useAppSelector } from '../../../state/hooks'
import Avatar, { AvatarSize } from '../../ui/Avatar'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'

type Props = {
    onPress: () => void
}
const HeaderAvatar: React.FC<Props> = ({ onPress }) => {
    const { theme } = useTheme()
    const style = styles(theme)
    const matrixAuth = useAppSelector(selectMatrixAuth)

    const contents = !matrixAuth ? (
        <SvgImage
            name={'Smile'}
            size={SvgImageSize.sm}
            containerStyle={style.iconContainer}
            maxFontSizeMultiplier={1.5}
        />
    ) : (
        <View style={style.avatarContainer}>
            <Avatar
                id={matrixAuth?.userId || ''}
                url={matrixAuth?.avatarUrl}
                size={AvatarSize.sm}
                name={matrixAuth?.displayName || ''}
                containerStyle={style.avatarContainer}
                maxFontSizeMultiplier={1.5}
            />
        </View>
    )

    return (
        <Pressable hitSlop={10} onPress={onPress} style={style.pressable}>
            {contents}
        </Pressable>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        pressable: {
            shadowColor: '#000',
            shadowOffset: {
                width: 0,
                height: 1,
            },
            shadowOpacity: 0.22,
            shadowRadius: 2.22,
            borderRadius: 40,
            elevation: 3,
            marginRight: theme.spacing.xs,
        },
        iconContainer: {
            padding: theme.spacing.xs,
            backgroundColor: theme.colors.lightGrey,
            borderRadius: 40,
        },
        avatarContainer: {
            borderRadius: 40,
        },
    })

export default HeaderAvatar
