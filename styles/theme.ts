import { lightColors, createTheme } from '@rneui/themed'
import { DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native'

const colors = {
    ...lightColors,
    primary: '#0B1013',
    primaryLight: '#51768d',
    secondary: '#FFFFFF',
    orange: '#DF7B00',
}
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
        Text: {
            style: {
                color: colors.primary,
                fontFamily: 'AlbertSans-Regular',
                fontWeight: '500',
            },
            h4Style: {
                fontSize: 16,
            },
        },
    },
    colors: {
        ...colors,
    },
})

export default theme
