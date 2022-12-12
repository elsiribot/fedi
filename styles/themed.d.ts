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
            orange: string
            grey: string
            red: string
            white: string
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
    }
}
