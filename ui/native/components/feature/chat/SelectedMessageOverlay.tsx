import { useToast } from '@fedi/common/hooks/toast'
import {
    selectMatrixAuth,
    selectSelectedChatMessage,
    setMessageToEdit,
    setSelectedChatMessage,
} from '@fedi/common/redux'
import { MatrixEvent } from '@fedi/common/types'
import { MatrixEventContentType } from '@fedi/common/utils/matrix'
import { CameraRoll } from '@react-native-camera-roll/camera-roll'
import Clipboard from '@react-native-clipboard/clipboard'
import { Text, Theme, useTheme } from '@rneui/themed'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native'
import { exists } from 'react-native-fs'
import { RESULTS } from 'react-native-permissions'
import Share from 'react-native-share'
import { fedimint } from '../../../bridge'
import { useAppDispatch, useAppSelector } from '../../../state/hooks'
import { useStoragePermission } from '../../../utils/hooks'
import CustomOverlay from '../../ui/CustomOverlay'
import { Pressable } from '../../ui/Pressable'
import SvgImage from '../../ui/SvgImage'
import ChatEvent from './ChatEvent'

const SelectedMessageOverlay: React.FC = () => {
    const [deleteMessage, setDeleteMessage] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)
    const selectedMessage = useAppSelector(selectSelectedChatMessage)
    const dispatch = useAppDispatch()
    const { t } = useTranslation()
    const { theme } = useTheme()
    const toast = useToast()
    const matrixAuth = useAppSelector(selectMatrixAuth)
    const { storagePermission, requestStoragePermission } =
        useStoragePermission()

    const isMe = selectedMessage?.senderId === matrixAuth?.userId

    const closeOverlay = useCallback(() => {
        dispatch(setSelectedChatMessage(null))
    }, [dispatch])

    const confirmDeleteMessage = useCallback(async () => {
        if (!selectedMessage || !selectedMessage.eventId) return

        setIsDeleting(true)

        try {
            await fedimint.matrixDeleteMessage(
                selectedMessage.roomId,
                selectedMessage.eventId,
                null,
            )

            closeOverlay()
        } catch (e) {
            toast.error(t, e, 'errors.unknown-error')
        } finally {
            setIsDeleting(false)
        }
    }, [t, toast, closeOverlay, selectedMessage])

    const handleCopy = useCallback(() => {
        if (!selectedMessage || selectedMessage.content.msgtype !== 'm.text')
            return

        Clipboard.setString(selectedMessage.content.body)
        closeOverlay()
        toast.show({
            content: t('phrases.copied-to-clipboard'),
            status: 'success',
        })
    }, [t, toast, closeOverlay, selectedMessage])

    const handleEdit = useCallback(() => {
        if (!selectedMessage || selectedMessage.content.msgtype !== 'm.text')
            return

        dispatch(
            setMessageToEdit(
                selectedMessage as MatrixEvent<
                    MatrixEventContentType<'m.text'>
                >,
            ),
        )

        closeOverlay()
    }, [dispatch, closeOverlay, selectedMessage])

    const handleDownload = useCallback(async () => {
        if (
            !selectedMessage ||
            (selectedMessage.content.msgtype !== 'm.file' &&
                selectedMessage.content.msgtype !== 'm.image' &&
                selectedMessage.content.msgtype !== 'm.video')
        )
            return

        setIsDownloading(true)

        try {
            const hashHex = Buffer.from(
                selectedMessage.content.file.hashes.sha256,
            ).toString('hex')
            const extension = selectedMessage.content.body.split('.')[1] || ''
            const path = `${hashHex}.${extension}`

            const downloadedFilePath = await fedimint.matrixDownloadFile(
                path,
                selectedMessage.content,
            )

            if (!(await exists(downloadedFilePath))) {
                throw new Error('Image does not exist in fs')
            }

            if (selectedMessage.content.msgtype === 'm.file') {
                const mime = selectedMessage.content.info.mimetype.split('/')[1]
                try {
                    await Share.open({
                        filename:
                            Platform.OS === 'android'
                                ? selectedMessage.content.body.slice(
                                      0,
                                      -mime.length,
                                  )
                                : selectedMessage.content.body,
                        type: selectedMessage.content.info.mimetype,
                        url: downloadedFilePath.startsWith("file://") ? downloadedFilePath : `file://${downloadedFilePath}`,
                    })

                    toast.show({
                        content: t('feature.chat.file-saved'),
                        status: 'success',
                    })
                } catch {
                    /* no-op*/
                }
            } else {
                if (storagePermission !== RESULTS.GRANTED) {
                    await requestStoragePermission()
                }

                await CameraRoll.save(downloadedFilePath, {
                    type: 'auto',
                })

                toast.show({
                    content: t('feature.chat.saved-to-photos'),
                    status: 'success',
                })
            }
        } catch (err) {
            toast.error(t, err, 'errors.unknown-error')
        } finally {
            setIsDownloading(false)
            closeOverlay()
        }
    }, [
        selectedMessage,
        t,
        toast,
        closeOverlay,
        storagePermission,
        requestStoragePermission,
    ])

    useEffect(() => {
        setDeleteMessage(false)
    }, [selectedMessage])

    const style = styles(theme)

    return (
        <CustomOverlay
            onBackdropPress={closeOverlay}
            show={!!selectedMessage}
            contents={{
                body: deleteMessage ? (
                    <View style={style.confirmDeleteContainer}>
                        <View style={style.previewMessageContainer}>
                            <ChatEvent
                                event={
                                    selectedMessage as MatrixEvent<
                                        MatrixEventContentType<
                                            | 'm.text'
                                            | 'm.image'
                                            | 'm.video'
                                            | 'm.file'
                                        >
                                    >
                                }
                                last
                                fullWidth={false}
                            />
                            {/* prevent user from interacting with the chat event */}
                            <View style={style.previewMessageOverlay} />
                        </View>
                        <Text medium>
                            {t('feature.chat.confirm-delete-message')}
                        </Text>
                    </View>
                ) : (
                    <View style={style.optionsContainer}>
                        {selectedMessage?.content.msgtype === 'm.text' && (
                            <>
                                <Pressable
                                    onPress={handleCopy}
                                    containerStyle={style.action}>
                                    <SvgImage name="Copy" />
                                    <Text bold>{t('phrases.copy-text')}</Text>
                                </Pressable>
                                {isMe && (
                                    <Pressable
                                        onPress={handleEdit}
                                        containerStyle={style.action}>
                                        <SvgImage name="Edit" />
                                        <Text bold>{t('words.edit')}</Text>
                                    </Pressable>
                                )}
                            </>
                        )}
                        {(selectedMessage?.content.msgtype === 'm.image' ||
                            selectedMessage?.content.msgtype === 'm.video' ||
                            selectedMessage?.content.msgtype === 'm.file') && (
                            <Pressable
                                onPress={handleDownload}
                                containerStyle={style.action}>
                                {isDownloading ? (
                                    <ActivityIndicator />
                                ) : (
                                    <SvgImage name="Download" />
                                )}
                                <Text bold>{t('words.download')}</Text>
                            </Pressable>
                        )}
                        {isMe && (
                            <Pressable
                                onPress={() => setDeleteMessage(true)}
                                containerStyle={style.action}>
                                <SvgImage
                                    color={theme.colors.red}
                                    name="Trash"
                                />
                                <Text bold style={style.danger}>
                                    {t('words.delete')}
                                </Text>
                            </Pressable>
                        )}
                    </View>
                ),
                buttons: deleteMessage
                    ? [
                          {
                              text: t('words.cancel'),
                              onPress: closeOverlay,
                          },
                          {
                              primary: true,
                              text: t('words.delete'),
                              onPress: confirmDeleteMessage,
                              disabled: isDeleting,
                          },
                      ]
                    : undefined,
            }}
        />
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        optionsContainer: {
            width: '100%',
            flexDirection: 'column',
        },
        action: {
            gap: theme.spacing.lg,
        },
        danger: {
            color: theme.colors.red,
        },
        messageBubble: {
            padding: 10,
            backgroundColor: theme.colors.blue,
            maxWidth: theme.sizes.maxMessageWidth,
            overflow: 'hidden',
        },
        previewMessageContainer: {
            borderRadius: 16,
            borderBottomRightRadius: 4,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'center',
            maxWidth: theme.sizes.maxMessageWidth,
        },
        outgoingText: {
            color: theme.colors.secondary,
        },
        confirmDeleteContainer: {
            flexDirection: 'column',
            alignItems: 'center',
            paddingVertical: theme.spacing.lg,
            gap: theme.spacing.xl,
        },
        previewMessageOverlay: {
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1,
        },
    })

export default SelectedMessageOverlay
