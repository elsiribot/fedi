import { Text, Theme, useTheme } from '@rneui/themed'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'

import { FederationStatus } from '@fedi/common/types'

import Flex from '../../ui/Flex'
import SvgImage, { SvgImageName } from '../../ui/SvgImage'

type Props = {
    status: FederationStatus
}

const STATUS_ICONS: Record<FederationStatus, SvgImageName> = {
    unstable: 'Info',
    offline: 'AlertWarningTriangle',
    online: 'Online',
}

const FederationStatusIndicator = ({ status }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const localeStatus = t(
        // Avoid using template strings in the t() function to prevent unused i18n keys from being stripped out
        status === 'unstable'
            ? 'words.unstable'
            : status === 'online'
              ? 'words.online'
              : 'words.offline',
    )
    const style = styles(theme)
    const icon = STATUS_ICONS[status]
    const color =
        status === 'online' ? theme.colors.success : theme.colors.error

    return (
        <Flex row center shrink={false} style={[style.container]}>
            <SvgImage size={12} name={icon} color={color} />
            <Text
                medium
                caption
                numberOfLines={1}
                adjustsFontSizeToFit
                maxFontSizeMultiplier={1.4}>
                {localeStatus}
            </Text>
        </Flex>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            borderRadius: 8,
            backgroundColor: theme.colors.white,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.xs,
            gap: theme.spacing.xs,
        },
    })

export default FederationStatusIndicator
