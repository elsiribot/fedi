import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import ErrorIcon from '@fedi/common/assets/svgs/error.svg'
import { useUpdatingRef } from '@fedi/common/hooks/util'
import { selectActiveFederationId } from '@fedi/common/redux'
import { formatErrorMessage } from '@fedi/common/utils/format'

import { useAppSelector } from '../../hooks'
import { writeBridgeFile } from '../../lib/bridge'
import { fedimint } from '../../lib/bridge'
import { styled, theme } from '../../styles'
import { Button } from '../Button'
import { HoloLoader } from '../HoloLoader'
import { Icon } from '../Icon'
import * as Layout from '../Layout'
import { Text } from '../Text'

const VIDEO_FILE_PATH = 'backup-video.webm'

interface Props {
    videoBlob: Blob
    next(): void
}

export const SocialBackupUpload: React.FC<Props> = ({ videoBlob, next }) => {
    const { t } = useTranslation()
    const activeFederationId = useAppSelector(selectActiveFederationId)
    const [error, setError] = useState<unknown>()
    const nextRef = useUpdatingRef(next)

    useEffect(() => {
        if (error) return
        async function upload() {
            if (!activeFederationId) return
            try {
                // Write the video file to the bridge's file system
                const videoArray = new Uint8Array(await videoBlob.arrayBuffer())
                await writeBridgeFile(VIDEO_FILE_PATH, videoArray)
                // Upload the video file
                await fedimint.uploadBackupFile(
                    VIDEO_FILE_PATH,
                    activeFederationId,
                )
                // Continue to next screen
                nextRef.current()
            } catch (err) {
                setError(err)
            }
        }
        upload()
    }, [activeFederationId, videoBlob, error, nextRef])

    return (
        <>
            <Layout.Content centered>
                {error ? (
                    <Error>
                        <Icon icon={ErrorIcon} size="lg" />
                        <Text>
                            {formatErrorMessage(
                                t,
                                error,
                                'errors.unknown-error',
                            )}
                        </Text>
                        <Button onClick={() => setError(undefined)}>
                            {t('words.retry')}
                        </Button>
                    </Error>
                ) : (
                    <Content>
                        <HoloLoader size="xl" />
                        <Text variant="h2">
                            {t('feature.backup.creating-recovery-file')}
                        </Text>
                    </Content>
                )}
            </Layout.Content>
        </>
    )
}

const Content = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
})

const Error = styled(Content, {
    color: theme.colors.red,
})
