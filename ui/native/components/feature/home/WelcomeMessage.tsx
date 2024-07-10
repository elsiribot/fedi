import { Text, Theme, useTheme } from '@rneui/themed'
import { StyleSheet, View } from 'react-native'

import HoloGradient from '../../ui/HoloGradient'

type Props = {
    message: string
}
const WelcomeMessage = ({ message }: Props) => {
    const { theme } = useTheme()
    const style = styles(theme)
    return (
        <View style={style.container}>
            <HoloGradient level="100" gradientStyle={style.content}>
                <Text caption style={style.message}>
                    {message}
                    {/* Welcome to this Community. You can learn more on this
                    website. community.com */}
                </Text>
            </HoloGradient>
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            display: 'flex',
            // alignItems: 'center',
            justifyContent: 'center',
        },
        content: {
            padding: theme.spacing.lg,
            borderRadius: theme.borders.defaultRadius,
        },
        message: {
            textAlign: 'center',
            letterSpacing: -0.14,
            lineHeight: 18,
        },
    })

export default WelcomeMessage
