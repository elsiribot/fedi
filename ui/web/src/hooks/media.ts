import { useEffect, useState } from 'react'

import { MatrixEvent } from '@fedi/common/types'
import { makeLog } from '@fedi/common/utils/log'

import { fedimint, readBridgeFile } from '../lib/bridge/'

const log = makeLog('useLoadMedia')

export function useLoadMedia(
    event: MatrixEvent<'m.video' | 'm.image' | 'm.file'>,
) {
    const [src, setSrc] = useState<string | null>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<boolean>(false)

    useEffect(() => {
        let url: string | null = null

        const loadMedia = async () => {
            setLoading(true)
            try {
                const { body, source } = event.content

                const mediaPath = await fedimint.matrixDownloadFile(
                    body,
                    source,
                )

                const result = await readBridgeFile(mediaPath)
                const mimetype = event.content.info?.mimetype ?? undefined
                url = URL.createObjectURL(
                    new Blob([result], { type: mimetype }),
                )

                setSrc(url)
            } catch {
                log.error('failed to load media')
                setError(true)
            } finally {
                setLoading(false)
            }
        }

        loadMedia()

        return () => {
            url && URL.revokeObjectURL(url)
        }
    }, [event.content])

    return { error, loading, src }
}
