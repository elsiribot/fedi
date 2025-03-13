import { useEffect, useState } from 'react'
import { exists, TemporaryDirectoryPath } from 'react-native-fs'

import { MatrixEncryptedFile } from '@fedi/common/utils/matrix'

import { fedimint } from '../../bridge'
import { pathJoin, prefixFileUri } from '../media'

/**
 * Loads an encrypted matrix file / unencrypted matrix url
 * Downloads the file to the device's temporary directory
 * Returns the URI of the matrix file
 *
 * Cannot be moved to the `common` folder because it uses react-native-fs
 */
export const useMatrixFile = (file: MatrixEncryptedFile | string | null) => {
    const [isLoading, setIsLoading] = useState(true)
    const [isError, setIsError] = useState(false)
    const [uri, setURI] = useState<string | null>(null)

    useEffect(() => {
        const loadImage = async () => {
            if (file === null) return

            const imageUrl = typeof file === 'string' ? file : file.url
            // The last part of an mxc url is a slug-like identifier with the date and image extension
            // If `undefined`, use a random string
            const imageUrlEnding =
                imageUrl.split('/').at(-1) ??
                Math.random().toString(36).slice(2)

            try {
                const path = pathJoin(
                    TemporaryDirectoryPath,
                    // A file extension is required for a URI to be recognized by the <Image> component from React Native
                    // The file type is determined by the file content, so the extension doesn't matter
                    // Tests have been conducted successfully with multiple file formats including .png, .jpg, .gif, .webp, and .mp4 and they all work fine
                    `${imageUrlEnding}.png`,
                )

                const imagePath = await fedimint.matrixDownloadFile(
                    path,
                    typeof file === 'string' ? { url: file } : { file },
                )

                const imageUri = prefixFileUri(imagePath)

                if (await exists(imageUri)) {
                    setURI(prefixFileUri(imageUri))
                } else {
                    throw new Error('Image does not exist in fs')
                }
            } catch {
                setIsError(true)
            } finally {
                setIsLoading(false)
            }
        }

        loadImage()
    }, [file])

    return {
        uri,
        isLoading,
        isError,
    }
}
