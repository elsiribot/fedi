import { lightColors, createTheme } from '@rneui/themed'
import { DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native'

const colors = {
    ...lightColors,
    primary: '#0B1013',
    primaryLight: '#6D7071',
    primaryVeryLight: '#D3D4DB',
    secondary: '#FFFFFF',
    orange: '#DF7B00',
    grey: '#D9D9D9',
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
            disabledStyle: {
                opacity: 0.7,
            },
        },
        Text: {
            style: {
                color: colors.primary,
                fontFamily: 'AlbertSans-Regular',
                fontWeight: '600',
            },
            h3Style: {
                fontFamily: 'AlbertSans-Regular',
                fontSize: 24,
            },
            h4Style: {
                fontFamily: 'AlbertSans-Regular',
                fontSize: 16,
            },
        },
        Header: {
            containerStyle: {
                paddingTop: 0,
                paddingHorizontal: 24,
                borderBottomColor: colors.secondary,
            },
            leftContainerStyle: {
                flex: 1,
            },
            centerContainerStyle: {
                flex: 1,
            },
            rightContainerStyle: {
                flex: 1,
            },
        },
    },
    colors: {
        ...colors,
    },
    sizes: {
        xs: 12,
        sm: 24,
        md: 32,
        lg: 48,
    },
})

export default theme
