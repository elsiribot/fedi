import '@rneui/themed'

// This declaration is required to combine the Theme type
// from @react-naviation/native with the @rneui/themed Theme type
declare module '@rneui/themed' {
    type PlatformColorConfig = {
        ios: PlatformColors
        android: PlatformColors
        web: PlatformColors
        default: PlatformColors
    }
    export interface Theme {
        dark: boolean
        components: any
        colors: {
            [key: string]: string | PlatformColorConfig
        }
        sizes: {
            [key: string]: number
        }
    }
}
