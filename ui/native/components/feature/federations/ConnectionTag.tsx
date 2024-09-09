import { FederationStatus } from '@fedi/common/types'
import { Text, Theme, useTheme } from '@rneui/themed'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { ConnectionIcon } from './ConnectionIcon'

type Props = {
    status: FederationStatus
    size?: 'small' | 'large'
}

export const ConnectionTag = ({ status, size = 'small' }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const localeStatus = t(`words.${status}`)
    const style = styles(theme)
    const iconSize = size === 'small' ? 12 : 14
    return (
        <View
            style={[
                style.container,
                size === 'small' ? style.smallContainer : {},
            ]}>
            <ConnectionIcon size={iconSize} status={status} />
            <Text medium small numberOfLines={1} adjustsFontSizeToFit>
                {localeStatus}
            </Text>
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            borderRadius: 10,
            paddingHorizontal: theme.spacing.xs,
            gap: theme.spacing.xs,
            flexDirection: 'row',
            alignItems: 'center',
            height: 16,
            backgroundColor: theme.colors.white,
        },
        smallContainer: {
            height: theme.sizes.xs,
        },
        smallText: {
            lineHeight: 15,
        },
    })
