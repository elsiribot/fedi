import { Text, Theme, useTheme } from '@rneui/themed'
import { useCallback, useEffect, useState } from 'react'
import {
    ActivityIndicator,
    Image,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    View,
} from 'react-native'
import { exists } from 'react-native-fs'
import Share from 'react-native-share'

import { makeLog } from '@fedi/common/utils/log'
import { MatrixEventContentType } from '@fedi/common/utils/matrix'
import { scaleAttachment } from '@fedi/common/utils/media'
import { ImageZoom } from '@likashefqet/react-native-image-zoom'
import { useTranslation } from 'react-i18next'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'
import { fedimint } from '../../../bridge'
import SvgImage from '../../ui/SvgImage'

type ChatImageEventProps = {
    content: MatrixEventContentType<'m.image'>
}

const log = makeLog('ChatImageEvent')

const ChatImageEvent: React.FC<ChatImageEventProps> = ({
    content,
}: ChatImageEventProps) => {
    const [isLoading, setIsLoading] = useState(true)
    const [isError, setIsError] = useState(false)
    const [uri, setURI] = useState<string>('')
    const [imageViewer, setImageViewer] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)
    const { theme } = useTheme()
    const { t } = useTranslation()
    const insets = useSafeAreaInsets()

    const handleDownload = useCallback(async () => {
        if (!uri || !(await exists(uri))) return

        setIsDownloading(true)

        const mime = content.info.mimetype.split('/')[1]

        try {
            await Share.open({
                filename:
                    Platform.OS === 'android'
                        ? content.body.slice(0, -mime.length)
                        : content.body,
                type: content.info.mimetype,
                url: uri,
            })
        } catch {
            /* no-op */
        }

        setIsDownloading(false)
    }, [content, uri])

    useEffect(() => {
        const loadImage = async () => {
            try {
                const path = `${Buffer.from(
                    content.file.hashes.sha256,
                ).toString('hex')}.${content.info.mimetype.split('/')[1]}`

                const imagePath = await fedimint.matrixDownloadFile(
                    path,
                    content,
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
    }, [content])

    const style = styles(theme, insets)

    const dimensions = scaleAttachment(
        content.info.w,
        content.info.h,
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
            <Pressable onPress={() => setImageViewer(true)}>
                <Image
                    source={{ uri }}
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
                            ) : (
                                <SvgImage
                                    name="Download"
                                    color={theme.colors.secondary}
                                />
                            )}
                        </Pressable>
                    </View>
                    <ImageZoom uri={uri} style={style.imageZoomContainer} />
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
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
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
