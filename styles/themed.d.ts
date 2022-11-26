import '@rneui/themed'

// This declaration is required to combine the Theme type
// from @react-naviation/native with the @rneui/themed Theme type
declare module '@rneui/themed' {
    export interface Theme {
        dark: boolean
        components: any
        colors: {
            primary: string
            primaryLight: string
            secondary: string
            orange: string
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
