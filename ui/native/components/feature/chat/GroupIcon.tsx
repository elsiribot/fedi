import { Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import HoloAvatar from '../../ui/HoloAvatar'
import { AvatarSize } from '../../ui/HoloAvatar'
import SvgImage, { SvgImageName, SvgImageSize } from '../../ui/SvgImage'

type GroupIconProps = {
    iconName: SvgImageName
}

const GroupIcon = ({ iconName }: GroupIconProps) => {
    const { theme } = useTheme()
    return (
        <View style={styles(theme).container}>
            <View style={styles(theme).holoBackground}>
                <HoloAvatar title={''} size={AvatarSize.md} />
            </View>
            <View style={styles(theme).whiteCircle}>
                <SvgImage name={iconName} size={SvgImageSize.sm} />
            </View>
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            position: 'relative',
            height: theme.sizes.lg,
            width: theme.sizes.lg,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
        },
        holoBackground: {
            position: 'absolute',
            height: theme.sizes.lg,
            width: theme.sizes.lg,
        },
        whiteCircle: {
            position: 'absolute',
            height: theme.sizes.lg - 5,
            width: theme.sizes.lg - 5,
            borderRadius: theme.sizes.lg * 0.5,
            backgroundColor: theme.colors.white,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
        },
    })

export default GroupIcon
