import { Text, Theme, useTheme } from '@rneui/themed'
import { useCallback, useEffect, useState } from 'react'
import {
    ActivityIndicator,
    Image,
    Modal,
    Pressable,
    StyleSheet,
    View,
} from 'react-native'
import { exists } from 'react-native-fs'

import { setSelectedChatMessage } from '@fedi/common/redux'
import { MatrixEvent } from '@fedi/common/types'
import { makeLog } from '@fedi/common/utils/log'
import { MatrixEventContentType } from '@fedi/common/utils/matrix'
import { scaleAttachment } from '@fedi/common/utils/media'
import { ImageZoom } from '@likashefqet/react-native-image-zoom'
import { CameraRoll } from '@react-native-camera-roll/camera-roll'
import { useTranslation } from 'react-i18next'
import { RESULTS } from 'react-native-permissions'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'
import { fedimint } from '../../../bridge'
import { useAppDispatch } from '../../../state/hooks'
import { useStoragePermission } from '../../../utils/hooks'
import SvgImage from '../../ui/SvgImage'

type ChatImageEventProps = {
    event: MatrixEvent<MatrixEventContentType<'m.image'>>
}

const log = makeLog('ChatImageEvent')

const ChatImageEvent: React.FC<ChatImageEventProps> = ({
    event,
}: ChatImageEventProps) => {
    const [isLoading, setIsLoading] = useState(true)
    const [isError, setIsError] = useState(false)
    const [uri, setURI] = useState<string>('')
    const [imageViewer, setImageViewer] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)
    const [hasDownloaded, setHasDownloaded] = useState(false)
    const { theme } = useTheme()
    const { t } = useTranslation()
    const insets = useSafeAreaInsets()
    const dispatch = useAppDispatch()
    const { storagePermission, requestStoragePermission } =
        useStoragePermission()

    const resolvedUri = uri.startsWith('file://') ? uri : `file://${uri}`

    const handleLongPress = () => {
        dispatch(setSelectedChatMessage(event))
    }

    const handleDownload = useCallback(async () => {
        if (!resolvedUri || !(await exists(resolvedUri))) return

        setIsDownloading(true)

        try {
            if (storagePermission !== RESULTS.GRANTED) {
                await requestStoragePermission()
            }

            await CameraRoll.saveAsset(resolvedUri, { type: 'photo' })

            setHasDownloaded(true)
            setTimeout(() => setHasDownloaded(false), 1000)
        } catch (e) {
            log.error('Failed to download image', e)
        } finally {
            setIsDownloading(false)
        }
    }, [resolvedUri, storagePermission, requestStoragePermission])

    useEffect(() => {
        const loadImage = async () => {
            try {
                const path = `${Buffer.from(
                    event.content.file.hashes.sha256,
                ).toString('hex')}.${event.content.info.mimetype.split('/')[1]}`

                const imagePath = await fedimint.matrixDownloadFile(
                    path,
                    event.content,
                )

                if (await exists(imagePath)) {
                    setURI(imagePath)
                } else {
                    throw new Error('Image does not exist in fs')
                }
            } catch (err) {
                log.error('Failed to load image', err)
                setIsError(true)
            } finally {
                setIsLoading(false)
            }
        }

        loadImage()
    }, [event.content])

    const style = styles(theme, insets)

    const dimensions = scaleAttachment(
        event.content.info.w,
        event.content.info.h,
        theme.sizes.maxMessageWidth,
        400,
    )

    const imageBaseStyle = [style.imageBase, dimensions]

    return isLoading || !uri || isError ? (
        <View style={imageBaseStyle}>
            {isError ? (
                <View style={style.imageError}>
                    <SvgImage name="ImageOff" color={theme.colors.grey} />
                    <Text caption style={style.errorCaption}>
                        {t('errors.failed-to-load-image')}
                    </Text>
                </View>
            ) : (
                <ActivityIndicator />
            )}
        </View>
    ) : (
        <>
            <Pressable
                onPress={() => setImageViewer(true)}
                onLongPress={handleLongPress}>
                <Image
                    source={{ uri: resolvedUri }}
                    style={imageBaseStyle}
                    onError={() => setIsError(true)}
                />
            </Pressable>
            <Modal visible={imageViewer}>
                <View style={style.imageViewerContainer}>
                    <View style={style.imageViewerHeader}>
                        <Pressable onPress={() => setImageViewer(false)}>
                            <SvgImage
                                name="Close"
                                color={theme.colors.secondary}
                            />
                        </Pressable>
                        <Pressable onPress={handleDownload}>
                            {isDownloading ? (
                                <ActivityIndicator />
                            ) : hasDownloaded ? (
                                <SvgImage
                                    name="Check"
                                    color={theme.colors.green}
                                />
                            ) : (
                                <SvgImage
                                    name="Download"
                                    color={theme.colors.secondary}
                                />
                            )}
                        </Pressable>
                    </View>
                    <ImageZoom
                        uri={resolvedUri}
                        style={style.imageZoomContainer}
                    />
                </View>
            </Modal>
        </>
    )
}

const styles = (theme: Theme, insets: EdgeInsets) =>
    StyleSheet.create({
        imageBase: {
            maxWidth: theme.sizes.maxMessageWidth,
            maxHeight: 400,
            backgroundColor: theme.colors.extraLightGrey,
            padding: 16,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
        },
        imageError: {
            flexDirection: 'column',
            gap: theme.spacing.md,
            alignItems: 'center',
        },
        errorCaption: {
            color: theme.colors.darkGrey,
        },
        imageViewerContainer: {
            paddingTop: Math.max(insets.top, theme.spacing.sm),
            paddingBottom: Math.max(insets.bottom, theme.spacing.sm),
            display: 'flex',
            flex: 1,
            backgroundColor: theme.colors.night,
        },
        imageZoomContainer: {
            flex: 1,
        },
        imageViewerHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: theme.spacing.lg,
        },
    })

export default ChatImageEvent
