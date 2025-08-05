import {
    DocumentPickerOptions,
    DocumentPickerResponse,
    keepLocalCopy,
    pick,
} from '@react-native-documents/picker'
import { TFunction } from 'i18next'
import { err, errAsync, ok, okAsync, ResultAsync } from 'neverthrow'
import { TemporaryDirectoryPath } from 'react-native-fs'
import {
    Asset,
    ImageLibraryOptions,
    launchImageLibrary,
} from 'react-native-image-picker'

import { MAX_FILE_SIZE, MAX_IMAGE_SIZE } from '@fedi/common/constants/matrix'
import { InputAttachment, InputMedia } from '@fedi/common/types'
import {
    GenericError,
    MissingDataError,
    UserError,
} from '@fedi/common/types/errors'
import {
    makeError,
    makeLocalizedError,
    tryTag,
    UnexpectedError,
} from '@fedi/common/utils/errors'
import { makeLog } from '@fedi/common/utils/log'
import {
    formatFileSize,
    pathJoin,
    prefixFileUri,
} from '@fedi/common/utils/media'
import { ensureNonNullish } from '@fedi/common/utils/neverthrow'

const log = makeLog('utils/media')

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
export function deriveCopyableFileUri({
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

    if (document.uri.startsWith('content://')) {
        return ResultAsync.fromPromise(
            keepLocalCopy({
                files: [
                    {
                        uri: document.uri,
                        fileName: name,
                    },
                ],
                destination: 'cachesDirectory',
            }),
            tryTag('GenericError'),
        )
            .andThen(([result]) => {
                if (result.status === 'success') return ok(result.localUri)

                return err(
                    makeError(new Error(result.copyError), 'GenericError'),
                )
            })
            .orTee(e => log.error(`Error copying document ${document.uri}`, e))
    }

    return okAsync(document.uri)
}

/**
 * Attempt to select assets with the ImagePicker.
 * If any assets exceed the maximum image size, short-circuit with a UserError.
 */
export function tryPickAssets(
    imageOptions: ImageLibraryOptions,
    t: TFunction,
): ResultAsync<
    Array<Asset>,
    UnexpectedError | GenericError | MissingDataError | UserError
> {
    return ResultAsync.fromPromise(
        launchImageLibrary(imageOptions),
        tryTag('GenericError'),
    )
        .andThen(library => {
            if (library.didCancel)
                return err(
                    makeError(
                        new Error('Image library cancelled'),
                        'GenericError',
                    ),
                )

            return ok(library.assets)
        })
        .andThen(ensureNonNullish)
        .andThrough(assets => {
            const anyImageExceedsSize = assets
                .filter(asset => asset.type?.includes('image'))
                .some(asset => doesAssetExceedSize(asset, MAX_IMAGE_SIZE))
            const anyVideoExceedsSize = assets
                .filter(asset => asset.type?.includes('video'))
                .some(asset => doesAssetExceedSize(asset, MAX_FILE_SIZE))

            if (anyImageExceedsSize) {
                return err(
                    makeLocalizedError(
                        t,
                        'UserError',
                        'errors.images-may-not-exceed-size',
                        {
                            size: formatFileSize(MAX_IMAGE_SIZE),
                        },
                    ),
                )
            }

            if (anyVideoExceedsSize) {
                return err(
                    makeLocalizedError(
                        t,
                        'UserError',
                        'errors.videos-may-not-exceed-size',
                        {
                            size: formatFileSize(MAX_FILE_SIZE),
                        },
                    ),
                )
            }

            return ok()
        })
}

/**
 * Attempt to select documents with the DocumentPicker.
 * If any documents exceed the maximum file size, short-circuit with a UserError.
 */
export function tryPickDocuments(
    options: DocumentPickerOptions,
    t: TFunction,
): ResultAsync<
    Array<DocumentPickerResponse>,
    UnexpectedError | GenericError | UserError
> {
    return ResultAsync.fromPromise(
        pick(options),
        tryTag('GenericError'),
    ).andThrough(documents => {
        if (documents.some(doc => doesDocumentExceedSize(doc, MAX_FILE_SIZE))) {
            return err(
                makeLocalizedError(
                    t,
                    'UserError',
                    'errors.files-may-not-exceed-size',
                    {
                        size: formatFileSize(MAX_FILE_SIZE),
                    },
                ),
            )
        }
        return ok()
    })
}

export const doesAssetExceedSize = (
    { fileSize }: Asset,
    maxSizeBytes: number,
) => fileSize && fileSize > maxSizeBytes

export const doesDocumentExceedSize = (
    document: DocumentPickerResponse,
    maxSizeBytes: number,
) => document.size && document.size > maxSizeBytes

export const mapMixedMediaToMatrixInput = ({
    assets,
    documents,
}: {
    assets: Array<Asset>
    documents: Array<DocumentPickerResponse>
}) => {
    const allAttachments: Array<InputMedia | InputAttachment> = []

    for (const att of documents) {
        if (!att.name || !att.type) continue

        allAttachments.push({
            fileName: att.name,
            mimeType: att.type,
            uri: att.uri,
        })
    }

    for (const att of assets) {
        if (!att.fileName || !att.type || !att.uri || !att.width || !att.height)
            continue

        allAttachments.push({
            fileName: att.fileName,
            mimeType: att.type,
            uri: att.uri,
            width: att.width,
            height: att.height,
        })
    }

    return allAttachments
}
