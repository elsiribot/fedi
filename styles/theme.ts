import { Platform } from 'react-native'
import { lightColors, createTheme } from '@rneui/themed'
import { DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native'

const theme = createTheme({
    ...NavigationDefaultTheme,
    components: {
        Button: {
            containerStyle: {
                borderRadius: 50,
            },
            titleStyle: {
                paddingLeft: 10,
                paddingRight: 10,
            },
        },
    },
    lightColors: {
        ...Platform.select({
            default: lightColors.platform.android,
            ios: lightColors.platform.ios,
        }),
    },
})

export default theme
