import { Text, Theme, useTheme } from '@rneui/themed'
import { StyleSheet } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'

import { theme as fediTheme } from '@fedi/common/constants/theme'

import SvgImage from '../../ui/SvgImage'

type Props = {
    message: string
}
const PinnedMessage = ({ message }: Props) => {
    const { theme } = useTheme()
    const style = styles(theme)
    return (
        <LinearGradient
            start={{ x: 0.1, y: 1 }}
            end={{ x: 0.9, y: 0 }}
            colors={[...fediTheme.skyLinearGradient]}
            style={style.content}>
            <SvgImage name="Pin" />
            <Text caption style={style.message}>
                {message}
            </Text>
        </LinearGradient>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        content: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            paddingVertical: theme.spacing.lg,
            paddingHorizontal: theme.spacing.xl,
            borderRadius: theme.borders.defaultRadius,
        },
        message: {
            flex: 1,
            letterSpacing: -0.1,
            lineHeight: 18,
        },
    })

export default PinnedMessage
