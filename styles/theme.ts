import { lightColors, createTheme } from '@rneui/themed'
import { DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native'

const colors = {
    ...lightColors,
    primary: '#0B1013',
    primaryLight: '#6D7071',
    primaryVeryLight: '#D3D4DB',
    success: '#00A829',
    secondary: '#FFFFFF',
    orange: '#DF7B00',
    grey: '#D9D9D9',
    red: '#E00A00',
    white: '#FFFFFF',
    black: '#0B1013',
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
        Text: props => ({
            style: {
                color: colors.primary,
                fontFamily: 'AlbertSans-Regular',
                fontWeight: '400',
                fontSize: 16,
                ...(props.bold ? { fontFamily: 'AlbertSans-Bold' } : {}),
                ...(props.medium ? { fontFamily: 'AlbertSans-Medium' } : {}),
                ...(props.caption ? { fontSize: 14 } : {}),
                ...(props.small ? { fontSize: 12 } : {}),
                ...(props.tiny ? { fontSize: 10 } : {}),
            },
            h1Style: {
                fontWeight: '400',
                fontSize: 32,
                fontFamily: 'AlbertSans-Regular',
                ...(props.bold ? { fontFamily: 'AlbertSans-Bold' } : {}),
                ...(props.medium ? { fontFamily: 'AlbertSans-Medium' } : {}),
            },
            h2Style: {
                fontWeight: '400',
                fontSize: 24,
                fontFamily: 'AlbertSans-Regular',
                ...(props.bold ? { fontFamily: 'AlbertSans-Bold' } : {}),
                ...(props.medium ? { fontFamily: 'AlbertSans-Medium' } : {}),
            },
        }),
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
        xxs: 12,
        xs: 16,
        sm: 24,
        md: 32,
        lg: 48,
        expandedWalletCardHeight: 325,
    },
    spacing: {
        xxs: 2,
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
        xxl: 48,
    },
    borders: {
        defaultRadius: 16,
    },
})

export default theme
