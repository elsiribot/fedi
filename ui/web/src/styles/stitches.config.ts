import { createStitches } from '@stitches/react'
import { theme as fediTheme } from '@fedi/common/constants/theme'

export const {
    styled,
    css,
    globalCss,
    keyframes,
    getCssText,
    theme,
    createTheme,
    config,
} = createStitches({
    theme: {
        colors: {
            ...fediTheme.colors,

            // Alpha'd versions of colors. Unfortunately no dynamic way to do this.
            night05: alphaHex(fediTheme.colors.night, 5),
            night10: alphaHex(fediTheme.colors.night, 10),
            night15: alphaHex(fediTheme.colors.night, 15),
            night20: alphaHex(fediTheme.colors.night, 20),
            night80: alphaHex(fediTheme.colors.night, 80),
            night90: alphaHex(fediTheme.colors.night, 90),
        },
        fonts: {
            body: `'Albert Sans', sans-serif`,
            mono: `"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace`,
        },
        sizes: intMapToPx(fediTheme.sizes),
        space: intMapToPx(fediTheme.spacing),
        fontSizes: intMapToPx(fediTheme.fontSizes),
    },
    media: {},
    utils: {
        holoGradient: (value: keyof (typeof fediTheme)['holoGradient']) => ({
            backgroundImage: `radial-gradient(89.9% 222.34% at 7.36% 24.19%, ${fediTheme.holoGradient[
                value
            ].join(', ')})`,
        }),
    },
})

function intMapToPx<T extends string>(
    map: Record<T, number>,
): Record<T, string> {
    return Object.entries(map).reduce((prev, [key, value]) => {
        prev[key as T] = `${value}px`
        return prev
    }, {} as Record<T, string>)
}

function alphaHex(hex: string, alpha: number) {
    return `${hex}${Math.floor(255 * (alpha / 100))
        .toString(16)
        .padStart(2, '0')}`
}
