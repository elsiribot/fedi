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
        },
        fonts: {
            albert: `'Albert Sans', sans-serif`,
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
