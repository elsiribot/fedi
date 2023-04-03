/**
 * @file
 * Library-agnostic theming information for a consistent Fedi look & feel
 */

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

const SIZES = {
    xxs: 12,
    xs: 16,
    sm: 24,
    md: 32,
    lg: 48,
    xl: 96,
    spacing: {
        xxs: 2,
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
        xxl: 48,
    },
    avatar: {
        sm: 32,
        md: 48,
        lg: 88,
    },
}

export const theme = {
    colors: {
        link: HEX_COLORS.blue,
        primary: HEX_COLORS.night,
        primaryLight: HEX_COLORS.darkGrey,
        primaryVeryLight: HEX_COLORS.lightGrey,
        success: HEX_COLORS.green,
        secondary: HEX_COLORS.white,
        ...HEX_COLORS,
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
        minMessageInputHeight: 48,
        maxMessageInputHeight: 120,
        recordButtonOuter: 68,
        recordButtonInner: 56,
        splashLogoHeight: 32,
        splashLogoWidth: 120,
        tabBarHeight: 72,
    },
    holoGradient: {
        '900': makeHoloGradientRgbas(1.0),
        '600': makeHoloGradientRgbas(0.6),
        '400': makeHoloGradientRgbas(0.3),
        '100': makeHoloGradientRgbas(0.13),
    },
}

/** Returns an array of holo gradient [r,g,b,a] values, given an alpha multiplier */
function makeHoloGradientRgbas(alphaMultiplier: number) {
    return [
        [224, 32, 32, 0.3],
        [247, 181, 0, 0.3],
        [109, 212, 0, 0.3],
        [0, 145, 255, 0.3],
        [250, 100, 0, 0.3],
        [255, 255, 255, 0.1],
        [98, 54, 255, 0.3],
        [182, 32, 224, 0.3],
    ].map(([r, g, b, a]) => `rgba(${r}, ${g}, ${b}, ${a * alphaMultiplier})`)
}
