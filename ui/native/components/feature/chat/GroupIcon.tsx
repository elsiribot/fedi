import { Text, Theme, useTheme } from '@rneui/themed'
import { t } from 'i18next'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import dateUtils from '@fedi/common/utils/DateUtils'
import stringUtils from '@fedi/common/utils/StringUtils'

import { DEFAULT_GROUP_NAME } from '../../../constants'
import { Chat, ChatType } from '../../../types'
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
