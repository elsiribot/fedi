import { DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native'
import { createTheme, lightColors } from '@rneui/themed'
import { Dimensions } from 'react-native'

const HEX_COLORS = {
    green: '#00A829',
    orange: '#DF7B00',
    darkGrey: '#6D7071',
    grey: '#858789',
    lightGrey: '#D3D4DB',
    extraLightGrey: '#E9E9EA',
    keyboardGrey: '#E8EAED',
    red: '#E00A00',
    white: '#FFFFFF',
    black: '#000000',
    night: '#0B1013',
    blue: '#0277F2',
}

const colors = {
    ...lightColors,
    link: HEX_COLORS.blue,
    primary: HEX_COLORS.night,
    primaryLight: HEX_COLORS.darkGrey,
    primaryVeryLight: HEX_COLORS.lightGrey,
    success: HEX_COLORS.green,
    secondary: HEX_COLORS.white,
    ...HEX_COLORS,
}

const dimensions = Dimensions.get('window')

const theme = createTheme({
    ...NavigationDefaultTheme,
    components: {
        Button: props => ({
            size: 'lg',
            containerStyle: {
                borderRadius: 50,
                ...(props.fullWidth ? { width: '100%' } : {}),
            },
            titleStyle: {
                paddingLeft: 10,
                paddingRight: 10,
                fontFamily: 'AlbertSans-Regular',
            },
            disabledStyle: {
                opacity: 0.7,
            },
            /*
                For button loading states, since we cannot determine the width
                of the button unless it is set to fullWidth, we make the
                background transparent + ActivityIndicator primary color to avoid
                the effect of a button changing sizes when switching load states
            */
            loadingProps: {
                color: theme.colors?.primary,
            },
            buttonStyle: {
                ...(props.loading
                    ? {
                          backgroundColor: 'transparent',
                          color: theme.colors?.primary,
                      }
                    : {}),
            },
        }),
        Text: props => ({
            style: {
                color: colors.primary,
                fontSize: 16,
                fontWeight: '400',
                fontFamily: 'AlbertSans-Regular',
                // Use fontFamily for bolding effects because the fontWeight
                // value only has 2 distinct variants in AlbertSans-Regular
                // whereas the design calls for a 3rd distinct variant (medium)
                ...(props.bold ? { fontFamily: 'AlbertSans-Bold' } : {}),
                ...(props.medium ? { fontFamily: 'AlbertSans-Medium' } : {}),
                // These props match the design spec and fontSize should rarely
                // be anything different than these specific values
                ...(props.caption ? { fontSize: 14 } : {}),
                ...(props.small ? { fontSize: 12 } : {}),
                ...(props.tiny ? { fontSize: 10 } : {}),
            },
            h1Style: {
                fontSize: 32,
                fontWeight: '400',
                fontFamily: 'AlbertSans-Regular',
                ...(props.bold ? { fontFamily: 'AlbertSans-Bold' } : {}),
                ...(props.medium ? { fontFamily: 'AlbertSans-Medium' } : {}),
            },
            h2Style: {
                fontSize: 24,
                fontWeight: '400',
                fontFamily: 'AlbertSans-Regular',
                ...(props.bold ? { fontFamily: 'AlbertSans-Bold' } : {}),
                ...(props.medium ? { fontFamily: 'AlbertSans-Medium' } : {}),
            },
        }),
        Input: {
            containerStyle: {
                height: 60,
            },
            inputStyle: {
                fontFamily: 'AlbertSans-Regular',
            },
        },
        Header: {
            containerStyle: {
                paddingHorizontal: 24,
                borderBottomColor: colors.secondary,
                // This helps maximize the clickable area for any header buttons
                paddingVertical: 0,
            },
            leftContainerStyle: {
                flex: 1,
            },
            centerContainerStyle: {
                flex: 4,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
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
        xl: 96,
        adminProfileCircle: 90,
        walletCardHeight: 200,
        smallAvatar: 32,
        mediumAvatar: 48,
        largeAvatar: 88,
        defaultHoloGradient: 32,
        holoGuidanceCircle: 180,
        progressBarHeight: 6,
        progressCircleThickness: 3,
        progressCircle: dimensions.height * 0.25,
        progressInnerCircle: dimensions.height * 0.25 - 10,
        maxMessageWidth: dimensions.width * 0.75,
        minMessageInputHeight: 48,
        maxMessageInputHeight: 120,
        recordButtonOuter: 68,
        recordButtonInner: 56,
        socialBackupCameraWidth: dimensions.width * 0.9,
        socialBackupCameraHeight: dimensions.height * 0.4,
        splashLogoHeight: 32,
        splashLogoWidth: 120,
        tabBarHeight: 72,
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
        siteTileRadius: 12,
        progressBarRadius: 4,
    },
    styles: {
        h100w100: {
            height: '100%',
            width: '100%',
        },
    },
})

export default theme
