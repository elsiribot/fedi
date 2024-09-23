import { Text, Theme, useTheme } from '@rneui/themed'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native'
import { exists } from 'react-native-fs'

import { setSelectedChatMessage } from '@fedi/common/redux'
import { makeLog } from '@fedi/common/utils/log'
import { TypedMatrixEvent } from '@fedi/common/utils/matrix'
import { scaleAttachment } from '@fedi/common/utils/media'
import { CameraRoll } from '@react-native-camera-roll/camera-roll'
import { useTranslation } from 'react-i18next'
import { RESULTS } from 'react-native-permissions'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'
import Video from 'react-native-video'
import { fedimint } from '../../../bridge'
import { useAppDispatch } from '../../../state/hooks'
import { useStoragePermission } from '../../../utils/hooks'
import SvgImage from '../../ui/SvgImage'

type ChatVideoEventProps = {
    event: TypedMatrixEvent<'m.video'>
}

const log = makeLog('ChatVideoEvent')

const ChatVideoEvent: React.FC<ChatVideoEventProps> = ({
    event,
}: ChatVideoEventProps) => {
    const [isLoading, setIsLoading] = useState(true)
    const [isError, setIsError] = useState(false)
    const [uri, setURI] = useState<string>('')
    const [paused, setPaused] = useState(true)
    const [isFullscreenAndroid, setIsFullscreenAndroid] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)
    const [hasDownloaded, setHasDownloaded] = useState(false)
    const { theme } = useTheme()
    const { t } = useTranslation()
    const videoRef = useRef<Video | null>(null)
    const dispatch = useAppDispatch()
    const insets = useSafeAreaInsets()
    const { storagePermission, requestStoragePermission } =
        useStoragePermission()

    const resolvedUri = uri.startsWith('file://') ? uri : `file://${uri}`

    const handleDownload = useCallback(async () => {
        if (!resolvedUri || !(await exists(resolvedUri))) return

        setIsDownloading(true)

        try {
            if (storagePermission !== RESULTS.GRANTED) {
                await requestStoragePermission()
            }

            await CameraRoll.saveAsset(resolvedUri, { type: 'video' })

            setHasDownloaded(true)
            setTimeout(() => setHasDownloaded(false), 1000)
        } catch (e) {
            log.error('Failed to download video', e)
        } finally {
            setIsDownloading(false)
        }
    }, [resolvedUri, storagePermission, requestStoragePermission])

    const handleLongPress = () => {
        dispatch(setSelectedChatMessage(event))
    }

    useEffect(() => {
        const loadVideo = async () => {
            try {
                const path = `${Buffer.from(
                    event.content.file.hashes.sha256,
                ).toString('hex')}.${event.content.info.mimetype.split('/')[1]}`

                const videoPath = await fedimint.matrixDownloadFile(
                    path,
                    event.content,
                )

                if (await exists(videoPath)) {
                    setURI(videoPath)
                } else {
                    throw new Error('Video does not exist in fs')
                }
            } catch (err) {
                log.error('Failed to load video', err)
                setIsError(true)
            } finally {
                setIsLoading(false)
            }
        }

        loadVideo()
    }, [event.content])

    const style = styles(theme, insets)

    const dimensions = scaleAttachment(
        event.content.info.w,
        event.content.info.h,
        theme.sizes.maxMessageWidth,
        400,
    )

    const videoBaseStyle = [style.videoBase, dimensions]

    return isLoading || !uri || isError ? (
        <View style={videoBaseStyle}>
            {isError ? (
                <View style={style.videoStyle}>
                    <SvgImage name="VideoOff" color={theme.colors.grey} />
                    <Text caption style={style.errorCaption}>
                        {t('errors.failed-to-load-video')}
                    </Text>
                </View>
            ) : (
                <ActivityIndicator />
            )}
        </View>
    ) : (
        <View style={style.videoContainer}>
            <Video
                ref={videoRef}
                source={{ uri: resolvedUri }}
                style={videoBaseStyle}
                onError={() => setIsError(true)}
                paused={paused}
                onFullscreenPlayerDidPresent={() => {
                    setPaused(false)
                }}
                onFullscreenPlayerDidDismiss={() => {
                    setPaused(true)
                }}
            />
            <TouchableOpacity
                style={style.overlay}
                onPress={() => {
                    // Android doesn't have a native fullscreen video player
                    if (Platform.OS === 'android') {
                        setIsFullscreenAndroid(true)
                        setPaused(false)
                    } else {
                        // iOS has a native fullscreen video player
                        videoRef.current?.presentFullscreenPlayer()
                    }
                }}
                onLongPress={handleLongPress}>
                <View style={style.playButton}>
                    <SvgImage name="Play" color={theme.colors.white} />
                </View>
            </TouchableOpacity>

            {/* Android-only fullscreen video player */}
            {Platform.OS === 'android' && (
                <Modal visible={isFullscreenAndroid}>
                    <View style={style.fullScreenContainer}>
                        <View style={style.fullScreenVideoHeader}>
                            <Pressable
                                onPress={() => {
                                    setIsFullscreenAndroid(false)
                                    setPaused(true)
                                }}>
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
                        <Video
                            source={{ uri: resolvedUri }}
                            style={style.fullScreenVideo}
                            onError={() => setIsError(true)}
                            paused={paused}
                            controls
                            resizeMode="contain"
                        />
                    </View>
                </Modal>
            )}
        </View>
    )
}

const styles = (theme: Theme, insets: EdgeInsets) =>
    StyleSheet.create({
        videoBase: {
            maxWidth: theme.sizes.maxMessageWidth,
            maxHeight: 400,
            backgroundColor: theme.colors.extraLightGrey,
            padding: 16,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
        },
        fullScreenContainer: {
            paddingTop: Math.max(insets.top, theme.spacing.sm),
            paddingBottom: Math.max(insets.bottom, theme.spacing.sm),
            display: 'flex',
            flex: 1,
            backgroundColor: theme.colors.night,
        },
        fullScreenVideo: {
            flex: 1,
        },
        fullScreenVideoHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: theme.spacing.lg,
        },
        videoStyle: {
            flexDirection: 'column',
            gap: theme.spacing.md,
            alignItems: 'center',
        },
        errorCaption: {
            color: theme.colors.darkGrey,
        },
        videoContainer: {
            position: 'relative',
        },
        overlay: {
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            justifyContent: 'center',
            alignItems: 'center',
        },
        playButton: {
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
        },
    })

export default ChatVideoEvent
