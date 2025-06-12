import { errAsync, okAsync, ResultAsync } from 'neverthrow'
import { Platform } from 'react-native'
import {
    DocumentPickerOptions,
    DocumentPickerResponse,
    pick,
} from 'react-native-document-picker'
import RNFS, { TemporaryDirectoryPath } from 'react-native-fs'
import {
    Asset,
    ImageLibraryOptions,
    launchImageLibrary,
} from 'react-native-image-picker'

import { GenericError, MissingDataError } from '@fedi/common/types/errors'
import { makeError, tryTag, UnexpectedError } from '@fedi/common/utils/errors'
import { makeLog } from '@fedi/common/utils/log'
import { pathJoin } from '@fedi/common/utils/media'

const log = makeLog('utils/media')

/**
 * Ensures that the file URI is prefixed with `file://` if it is not already.
 */
export const prefixFileUri = (uri: string) =>
    uri.startsWith('file://') ? uri : `file://${uri}`

/**
 * Strips off file:// from a file URI if it is present.
 */
export const stripFileUriPrefix = (uri: string) =>
    uri.startsWith('file://') ? uri.slice(7) : uri

export function makeRandomTempFilePath(fileName: string) {
    const dirName = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const dirPath = pathJoin(TemporaryDirectoryPath, dirName)
    const path = pathJoin(dirPath, fileName)
    const uri = prefixFileUri(path)

    return { dirPath, uri, path }
}

/**
 * Converts a DocumentPickerResponse to a file URI.
 * Handles Android content URIs which may not have the filename in the URI.
 */
export function copyDocumentToTempUri({
    name,
    ...document
}: DocumentPickerResponse): ResultAsync<
    string,
    UnexpectedError | MissingDataError | GenericError
> {
    if (!name)
        return errAsync(
            makeError(
                new Error(`expected document.name, got ${name}`),
                'MissingDataError',
            ),
        )

    const { path, uri } = makeRandomTempFilePath(name)

    if (document.uri.startsWith('content://')) {
        return ResultAsync.fromPromise(
            RNFS.readFile(document.uri, 'base64'),
            tryTag('GenericError'),
        )
            .andThen(inputStream =>
                ResultAsync.fromPromise(
                    RNFS.writeFile(path, inputStream, 'base64'),
                    tryTag('GenericError'),
                ),
            )
            .map(() => uri)
            .orTee(e => log.error(`Error copying document ${document.uri}`, e))
    }

    return okAsync(document.uri)
}

export function copyAssetToTempUri(
    asset: Asset,
): ResultAsync<string, UnexpectedError | MissingDataError | GenericError> {
    const { uri, fileName } = asset

    if (!uri)
        return errAsync(
            makeError(
                new Error(`expected asset.uri, got ${asset.uri}`),
                'MissingDataError',
            ),
        )

    if (!fileName)
        return errAsync(
            makeError(
                new Error(`expected asset.fileName, got ${asset.fileName}`),
                'MissingDataError',
            ),
        )

    const { dirPath, uri: resolvedUri } = makeRandomTempFilePath(fileName)

    return ResultAsync.fromPromise(RNFS.mkdir(dirPath), tryTag('GenericError'))
        .andThrough(() => {
            const assetUri = prefixFileUri(uri)
            let copyOrDownloadPromise: Promise<void | RNFS.DownloadResult>

            // Videos don't get copied correctly on iOS
            if (Platform.OS === 'ios' && asset.type?.includes('video/')) {
                copyOrDownloadPromise = RNFS.downloadFile({
                    fromUrl: assetUri,
                    toFile: resolvedUri,
                }).promise
            } else if (
                // On Android, the react-native-image-picker library is breaking the gif animation
                // somehow when it produces the file URI, so we copy the gif from the original path.
                // https://github.com/react-native-image-picker/react-native-image-picker/issues/2064#issuecomment-2460501473
                // TODO: Check if this is fixed upstream (perhaps in the turbo module) and remove this workaround
                Platform.OS === 'android' &&
                asset.originalPath &&
                // sometimes animated pics are webp files so we include webp in this workaround
                // even though some webp files are not animated and wouldn't be broken
                // but using the original path works either way, perhaps a small perf hit
                // if rn image-picker is optimizing when producing the file URI
                (asset.type?.includes('gif') || asset.type?.includes('webp'))
            ) {
                const animatedImageUri = prefixFileUri(asset.originalPath)
                copyOrDownloadPromise = RNFS.copyFile(
                    animatedImageUri,
                    resolvedUri,
                )
            } else {
                copyOrDownloadPromise = RNFS.copyFile(uri, resolvedUri)
            }

            return ResultAsync.fromPromise(
                copyOrDownloadPromise,
                tryTag('GenericError'),
            )
        })
        .map(() => resolvedUri)
        .orTee(e => log.error(`Error copying asset ${uri}`, e))
}

export const tryLaunchImageLibrary = (imageOptions: ImageLibraryOptions) =>
    ResultAsync.fromPromise(
        launchImageLibrary(imageOptions),
        tryTag('GenericError'),
    )

export const tryPickDocuments = (options: DocumentPickerOptions) =>
    ResultAsync.fromPromise(pick(options), tryTag('GenericError'))

export const doesAssetExceedSize = ({ fileSize }: Asset, size: number) =>
    fileSize && fileSize > size

export const doesDocumentExceedSize = (
    document: DocumentPickerResponse,
    size: number,
) => document.size && document.size > size
