import '@rneui/themed'

// This declaration is required to combine the Theme type
// from @react-naviation/native with the @rneui/themed Theme type
declare module '@rneui/themed' {
    export interface Theme {
        dark: boolean
        colors: {
            primary: string
            background: string
            card: string
            text: string
            border: string
            notification: string
        }
    }
}
