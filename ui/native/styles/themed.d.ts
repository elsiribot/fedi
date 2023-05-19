import '@rneui/themed'
import { ViewStyle } from 'react-native'

// This declaration is required to combine the Theme type
// from @react-naviation/native with the @rneui/themed Theme type
declare module '@rneui/themed' {
    export interface Theme {
        dark: boolean
        components: any
        colors: {
            // Add new color labels here
            link: string
            primary: string
            primaryLight: string
            primaryVeryLight: string
            secondary: string
            success: string
            // Add new colors here
            green: string
            orange: string
            darkGrey: string
            grey: string
            lightGrey: string
            extraLightGrey: string
            keyboardGrey: string
            red: string
            white: string
            black: string
            blue: string
            // @react-navigation requires these properties
            background: string
            card: string
            text: string
            border: string
            notification: string
        }
        percentages: {
            [key: string]: string
        }
        sizes: {
            [key: string]: number
        }
        styles: {
            [key: string]: ViewStyle
        }
        borders: {
            defaultRadius: number
            qrCodeRadius: number
            siteTileRadius: number
            progressBarRadius: number
        }
    }

    // theme.spacing properties must be defined here to override
    // the default from RNE that only defines xs through xl
    export interface ThemeSpacing {
        xxs: number
        xs: number
        sm: number
        md: number
        lg: number
        xl: number
        xxl: number
    }

    // This is an extension for the available props that can
    // be passed to a <Text> component
    export interface TextProps {
        bold?: boolean
        medium?: boolean
        caption?: boolean
        small?: boolean
        tiny?: boolean
    }
    export interface ButtonProps {
        fullWidth?: boolean
    }

    // Other RNE components can be extended similarly by defining them here
    export interface ComponentTheme {
        Button: Partial<TextProps>
        Text: Partial<TextProps>
    }
}
