import '@rneui/themed'

// This declaration is required to combine the Theme type
// from @react-naviation/native with the @rneui/themed Theme type
declare module '@rneui/themed' {
    export interface Theme {
        dark: boolean
        components: any
        colors: {
            // Add new colors here
            primary: string
            primaryLight: string
            primaryVeryLight: string
            secondary: string
            success: string
            orange: string
            grey: string
            red: string
            white: string
            black: string
            // @react-navigation requires these properties
            background: string
            card: string
            text: string
            border: string
            notification: string
        }
        sizes: {
            [key: string]: number
        }
        borders: {
            defaultRadius: number
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

    // Other RNE components can be extended similarly by defining them here
    export interface ComponentTheme {
        Text: Partial<TextProps>
    }
}
