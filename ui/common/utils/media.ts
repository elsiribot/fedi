import { z } from 'zod'

/**
 * Formats a file size in bytes to a human-readable string.
 */
export const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} b`
    else if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kb`
    else return `${(bytes / 1024 / 1024).toFixed(1)} mb`
}

/**
 * Scales an image to fit within a given maxWidth and maxHeight while maintaining its aspect ratio.
 */
export const scaleAttachment = (
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number,
) => {
    let width = originalWidth
    let height = originalHeight

    // Calculate scaling factors
    const widthScale = maxWidth / originalWidth
    const heightScale = maxHeight / originalHeight

    // Check which dimension exceeds the limit and scale accordingly
    if (width > maxWidth && height > maxHeight) {
        if (widthScale < heightScale) {
            // Limit by width
            width = maxWidth
            height *= widthScale // Apply scale to maintain aspect ratio
        } else {
            // Limit by height
            height = maxHeight
            width *= heightScale // Apply scale to maintain aspect ratio
        }
    } else if (width > maxWidth) {
        width = maxWidth
        height *= widthScale
    } else if (height > maxHeight) {
        height = maxHeight
        width *= heightScale
    }

    return { width, height }
}

export const matrixUrlMetadataSchema = z.object({
    'matrix:image:size': z.number().nullish(),
    'og:description': z.string().nullish(),
    'og:image': z.string().nullish(),
    'og:image:alt': z.string().nullish(),
    'og:image:height': z.number().nullish(),
    'og:image:type': z.string().nullish(),
    'og:image:width': z.number().nullish(),
    'og:site_name': z.string().nullish(),
    'og:title': z.string().nullish(),
    'og:type': z.string().nullish(),
    'og:url': z.string().nullish(),
})

export type MatrixUrlMetadata = z.infer<typeof matrixUrlMetadataSchema>
