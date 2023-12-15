import { styled } from '@stitches/react'
import { safebrowsing_v5 } from 'googleapis'
import * as React from 'react'

import Plus from '@fedi/common/assets/svgs/plus.svg'
import { makeLog } from '@fedi/common/utils/log'

import { useToast } from '../../hooks'
import { theme } from '../../styles'
import { Icon } from '../Icon'
import { Text } from '../Text'
import { FilePreview } from './FilePreview'

export type FileData = {
    id: string
    base64: string
    preview: string
    width: number
    height: number
    size: number
    type: string
    fileName: string
}

const log = makeLog('FileUploader')

export const FileUploader = ({
    files,
    setFiles,
}: {
    files: Array<FileData>
    setFiles: React.Dispatch<React.SetStateAction<FileData[]>>
}) => {
    const toast = useToast()
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const evtFiles = event.target.files
        if (!evtFiles) return

        Array.from(evtFiles).forEach(file => {
            const reader = new FileReader()
            reader.onloadend = () => {
                if (file.type.startsWith('image/')) {
                    const image = new Image()
                    image.src = reader.result as string
                    image.onload = () => {
                        setFiles(prev => [
                            ...prev,
                            {
                                id: Math.random().toString(36).slice(2),
                                base64: reader.result as string,
                                preview: reader.result as string,
                                width: image.width,
                                height: image.height,
                                size: file.size,
                                type: file.type,
                                fileName: file.name,
                            },
                        ])
                    }
                } else if (file.type.startsWith('video/')) {
                    applyVideo(file, reader.result as string)
                } else {
                    toast.showToast('Invalid file type provided')
                }
            }

            reader.readAsDataURL(file)
        })
    }

    /**
     * Adds a video file to the `files` state variable and uses the first frame as a preview image.
     */
    const applyVideo = async (file: File, base64: string) => {
        try {
            const video = document.createElement('video')
            video.src = base64

            video.load()

            video.addEventListener('canplaythrough', () => {
                const canvas = document.createElement('canvas')
                const { videoWidth: width, videoHeight: height } = video

                canvas.width = width
                canvas.height = height

                const ctx = canvas.getContext('2d')
                if (ctx) {
                    ctx.fillStyle = '#bbb'
                    ctx.fillRect(0, 0, width, height)

                    // Draw a fallback camera icon in case the video is transparent
                    ctx.lineWidth = 8
                    ctx.lineJoin = 'round'
                    ctx.strokeStyle = '#888'
                    ctx.strokeRect(15, 25, 50, 50)
                    ctx.stroke()
                    ctx.beginPath()
                    ctx.moveTo(65, 60)
                    ctx.lineTo(65, 40)
                    ctx.lineTo(85, 30)
                    ctx.lineTo(85, 70)
                    ctx.closePath()
                    ctx.stroke()

                    // Draw the video frame
                    ctx.drawImage(video, 0, 0, width, height)
                    video.remove()
                }

                const previewBase64 = canvas.toDataURL()

                setFiles(prev => [
                    ...prev,
                    {
                        id: Math.random().toString(36).slice(2),
                        base64: base64,
                        preview: previewBase64,
                        width,
                        height,
                        size: file.size,
                        type: file.type,
                        fileName: file.name,
                    },
                ])

                canvas.remove()
            })

            await video.play()
        } catch (e) {
            log.error('Could not play video', e)

            const canvas = document.createElement('canvas')

            canvas.width = 100
            canvas.height = 100

            const ctx = canvas.getContext('2d')

            if (ctx) {
                ctx.fillStyle = '#bbb'
                ctx.fillRect(0, 0, 100, 100)

                // Draw the camera icon
                ctx.lineWidth = 8
                ctx.lineJoin = 'round'
                ctx.strokeStyle = '#888'
                ctx.strokeRect(15, 25, 50, 50)
                ctx.stroke()
                ctx.beginPath()
                ctx.moveTo(65, 60)
                ctx.lineTo(65, 40)
                ctx.lineTo(85, 30)
                ctx.lineTo(85, 70)
                ctx.closePath()
                ctx.stroke()
            }

            setFiles(prev => [
                ...prev,
                {
                    id: Math.random().toString(36).slice(2),
                    base64: base64,
                    preview: canvas.toDataURL(),
                    width: 100,
                    height: 100,
                    size: file.size,
                    type: file.type,
                    fileName: file.name,
                },
            ])

            canvas.remove()
        }
    }

    /**
     * Removes a file from the `files` state variable by its ID
     */
    const handleRemoveFile = (id: string) => {
        setFiles(prev => prev.filter(file => file.id !== id))
    }

    return (
        <Container>
            {files.map(file => (
                <FilePreview
                    key={file.id}
                    fileData={file}
                    onRemove={handleRemoveFile}
                />
            ))}
            <FileInput
                type="file"
                onChange={handleFileChange}
                accept="image/*, video/*"
                id="file-input"
                tabIndex={-1}
                aria-hidden="true"
                multiple
            />
            <FileTrigger htmlFor="file-input">
                <Icon icon={Plus} size="xs" />
                <Text weight="medium">Upload</Text>
            </FileTrigger>
        </Container>
    )
}

const Container = styled('div', {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.space.sm,
})

const FileInput = styled('input', {
    opacity: 0,
    position: 'absolute',
    zIndex: -1,
    top: 0,
    left: 0,
    width: 1,
    height: 1,
})

const FileTrigger = styled('label', {
    background: theme.colors.blue100,
    borderRadius: theme.sizes.lg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${theme.space.md} ${theme.space.lg}`,
    gap: theme.space.sm,
    cursor: 'pointer',
    transition: 'opacity 100ms ease',
    willChange: 'opacity',

    '&:active': {
        opacity: 0.5,
    },
})
