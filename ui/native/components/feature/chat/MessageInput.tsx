import { Input, Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    Insets,
    Keyboard,
    KeyboardEvent,
    NativeSyntheticEvent,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TextInputContentSizeChangeEventData,
    View,
} from 'react-native'
import DocumentPicker, {
    DocumentPickerResponse,
    types,
} from 'react-native-document-picker'
import {
    Asset,
    ImageLibraryOptions,
    launchImageLibrary,
} from 'react-native-image-picker'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { theme as fediTheme } from '@fedi/common/constants/theme'
import { useToast } from '@fedi/common/hooks/toast'
import { useDebouncedEffect } from '@fedi/common/hooks/util'
import {
    selectChatDrafts,
    selectMatrixRoom,
    selectMatrixRoomIsReadOnly,
    selectMessageToEdit,
    setChatDraft,
    setMessageToEdit,
} from '@fedi/common/redux'
import { makeLog } from '@fedi/common/utils/log'

import { DocumentDirectoryPath, downloadFile } from 'react-native-fs'
import { fedimint } from '../../../bridge'
import { useAppDispatch, useAppSelector } from '../../../state/hooks'
import { Attachments } from '../../ui/Attachments'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'
import ChatWalletButton from './ChatWalletButton'

type MessageInputProps = {
    onMessageSubmitted: (
        message: string,
        attachments?: Array<Asset | DocumentPickerResponse>,
    ) => Promise<void>
    id: string
    isSending?: boolean
}

const log = makeLog('MessageInput')

const imageOptions: ImageLibraryOptions = {
    mediaType: 'mixed',
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 0.7,
    videoQuality: 'low',
    selectionLimit: 10,
}

const MessageInput: React.FC<MessageInputProps> = ({
    onMessageSubmitted,
    id,
    isSending,
}: MessageInputProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const insets = useSafeAreaInsets()
    const existingRoom = useAppSelector(s => selectMatrixRoom(s, id))
    const dispatch = useAppDispatch()

    const toast = useToast()
    const isReadOnly = useAppSelector(s => selectMatrixRoomIsReadOnly(s, id))
    const drafts = useAppSelector(s => selectChatDrafts(s))
    const [inputHeight, setInputHeight] = useState<number>(
        theme.sizes.minMessageInputHeight,
    )
    const [keyboardHeight, setKeyboardHeight] = useState<number>(0)
    const [messageText, setMessageText] = useState<string>(drafts[id] ?? '')
    const directUserId = useMemo(
        () => existingRoom?.directUserId ?? null,
        [existingRoom],
    )
    const inputRef = useRef<TextInput | null>(null)
    const editingMessage = useAppSelector(selectMessageToEdit)

    const isEditingMessage = !!editingMessage

    useDebouncedEffect(
        () => {
            dispatch(setChatDraft({ roomId: id, text: messageText }))
        },
        [messageText, dispatch],
        500,
    )
    const [attachments, setAttachments] = useState<DocumentPickerResponse[]>([])
    const [images, setImages] = useState<Asset[]>([])

    const handleUploadImage = useCallback(async () => {
        try {
            const res = await launchImageLibrary(imageOptions)

            if (res.assets) {
                const assets: Array<Asset> = []

                await Promise.all(
                    res.assets.map(async asset => {
                        const toUri = `${DocumentDirectoryPath}/${Date.now()}-${Math.random()
                            .toString(36)
                            .slice(2)}.${asset.type?.split('/')[1]}`

                        try {
                            await downloadFile({
                                fromUrl: asset.uri as string,
                                toFile: toUri,
                            }).promise

                            assets.push({ ...asset, uri: toUri })
                        } catch (downloadError) {
                            log.error(
                                'Download error for:',
                                asset.uri,
                                downloadError,
                            )
                        }
                    }),
                )

                setImages([...images, ...assets])
            }
        } catch (err) {
            toast.error(t, err)
        }
    }, [t, toast, images])

    const handleUploadAttachment = useCallback(async () => {
        try {
            const response = await DocumentPicker.pick({
                type: types.allFiles,
                allowMultiSelection: true,
            })

            if (response) {
                // Exclude duplicates
                setAttachments(
                    [...attachments, ...response].filter(
                        (a, i, arr) =>
                            arr.findIndex(b => b.uri === a.uri) === i,
                    ),
                )
            }
        } catch (error) {
            const typedError = error as Error
            log.error('DocumentPicker Error: ', typedError)
            // Hiding this because it shows the toast when user closes the dialogue ...
            // toast?.show(typedError?.message, 3000)
        }
    }, [attachments])

    const handleEdit = useCallback(async () => {
        if (!isEditingMessage || !messageText || !editingMessage.eventId) return

        try {
            await fedimint.matrixEditMessage(
                editingMessage.roomId,
                editingMessage.eventId,
                messageText,
            )
            setMessageText('')
            dispatch(setMessageToEdit(null))
        } catch (err) {
            toast.error(t, err, 'errors.chat-unavailable')
        }
    }, [editingMessage, isEditingMessage, messageText, t, toast, dispatch])

    useEffect(() => {
        const keyboardShownListener = Keyboard.addListener(
            'keyboardWillShow',
            (e: KeyboardEvent) => {
                setKeyboardHeight(e.endCoordinates.height)
            },
        )
        const keyboardHiddenListener = Keyboard.addListener(
            'keyboardWillHide',
            () => {
                setKeyboardHeight(0)
            },
        )

        return () => {
            keyboardShownListener.remove()
            keyboardHiddenListener.remove()
        }
    }, [])

    useEffect(() => {
        if (editingMessage) {
            setMessageText(editingMessage.content.body)
        }
    }, [editingMessage])

    const handleSend = useCallback(async () => {
        if (
            (!messageText && !images.length && !attachments.length) ||
            isSending
        )
            return

        try {
            const allAttachments = [...attachments, ...images]

            await onMessageSubmitted(messageText, allAttachments)
            setMessageText('')
            setImages([])
            setAttachments([])
        } catch (err) {
            toast.error(t, err, 'errors.chat-unavailable')
        }
    }, [
        isSending,
        messageText,
        onMessageSubmitted,
        toast,
        t,
        images,
        attachments,
    ])

    // Re-focus input after it had been disabled
    const inputDisabled = isSending || isReadOnly
    useEffect(() => {
        if (!inputDisabled) {
            inputRef.current?.focus()
        }
    }, [inputDisabled])

    const style = useMemo(() => styles(theme, insets), [theme, insets])

    const inputStyle = useMemo(() => {
        return isReadOnly ? style.textInputReadonly : style.textInputStyle
    }, [style, isReadOnly])

    const placeholder = useMemo(
        () =>
            isReadOnly
                ? t('feature.chat.broadcast-only-notice')
                : t('phrases.type-message'),
        [isReadOnly, t],
    )

    const handleContentSizeChange = useCallback(
        ({
            nativeEvent: {
                contentSize: { height },
            },
        }: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
            if (height > inputHeight) {
                setInputHeight(
                    Math.min(theme.sizes.maxMessageInputHeight, height),
                )
            } else if (height < inputHeight) {
                setInputHeight(
                    Math.max(theme.sizes.minMessageInputHeight, height),
                )
            }
        },
        [inputHeight, theme],
    )

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} bytes`
        else if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kb`
        else return `${(bytes / 1024 / 1024).toFixed(1)} mb`
    }

    return (
        <View
            style={[
                style.container,
                keyboardHeight > 0 && Platform.OS === 'ios'
                    ? { paddingBottom: keyboardHeight + theme.spacing.lg }
                    : { paddingBottom: theme.spacing.lg + insets.bottom },
                isReadOnly ? { borderTopWidth: 0 } : {},
            ]}>
            {attachments.length > 0 && (
                <View style={style.attachmentContainer}>
                    {attachments.map((att, i) => (
                        <View key={i} style={style.attachment}>
                            <View style={style.attachmentIcon}>
                                <SvgImage name="File" />
                            </View>
                            <View style={style.attachmentContent}>
                                <Text>{att.name}</Text>
                                <Text style={style.attachmentSize}>
                                    {formatSize(att.size ?? 0)}
                                </Text>
                            </View>
                            <Pressable
                                style={style.removeButton}
                                onPress={() =>
                                    setAttachments(prev =>
                                        prev.filter(a => a.uri !== att.uri),
                                    )
                                }>
                                <SvgImage
                                    name="Close"
                                    size={SvgImageSize.xs}
                                    color={theme.colors.white}
                                />
                            </Pressable>
                        </View>
                    ))}
                </View>
            )}
            {images.length > 0 && (
                <Attachments
                    attachments={images}
                    setAttachments={setImages}
                    uploadButton={false}
                    options={imageOptions}
                />
            )}
            <View style={style.inputContainer}>
                <Input
                    onChangeText={setMessageText}
                    value={messageText}
                    ref={(ref: unknown) => {
                        inputRef.current = ref as TextInput
                    }}
                    placeholder={`${placeholder}`}
                    onContentSizeChange={handleContentSizeChange}
                    containerStyle={[
                        style.textInputOuter,
                        { height: inputHeight },
                    ]}
                    inputContainerStyle={style.textInputInner}
                    inputStyle={inputStyle}
                    multiline
                    numberOfLines={3}
                    blurOnSubmit={false}
                    disabled={inputDisabled}
                />
                {!isReadOnly && !existingRoom && (
                    <Pressable
                        style={style.sendButton}
                        onPress={handleSend}
                        disabled={inputDisabled}>
                        <SvgImage
                            name="SendArrowUpCircle"
                            size={SvgImageSize.md}
                            color={
                                inputDisabled
                                    ? theme.colors.primaryVeryLight
                                    : theme.colors.blue
                            }
                        />
                    </Pressable>
                )}
            </View>
            {existingRoom && (
                <View style={style.buttonContainer}>
                    <View style={style.chatControls}>
                        {/* in-chat payments only available for DirectChat after a room has already been created with the user */}
                        {directUserId && (
                            <ChatWalletButton recipientId={directUserId} />
                        )}
                        <Pressable onPress={handleUploadImage}>
                            <SvgImage name="Image" />
                        </Pressable>
                        <Pressable onPress={handleUploadAttachment}>
                            <SvgImage name="Plus" />
                        </Pressable>
                    </View>
                    {!isReadOnly && (
                        <>
                            {isEditingMessage ? (
                                <View style={style.editButtonsEnd}>
                                    <Pressable
                                        style={style.cancelButton}
                                        onPress={() => {
                                            dispatch(setMessageToEdit(null))
                                            setMessageText('')
                                        }}
                                        disabled={inputDisabled}>
                                        <SvgImage
                                            name="Close"
                                            color={theme.colors.white}
                                        />
                                    </Pressable>
                                    <Pressable
                                        style={style.saveButton}
                                        onPress={handleEdit}
                                        disabled={inputDisabled}>
                                        <SvgImage
                                            name="Check"
                                            color={theme.colors.white}
                                        />
                                    </Pressable>
                                </View>
                            ) : (
                                <Pressable
                                    style={style.sendButton}
                                    onPress={handleSend}
                                    disabled={inputDisabled}>
                                    <SvgImage
                                        name="SendArrowUpCircle"
                                        size={SvgImageSize.md}
                                        color={
                                            inputDisabled
                                                ? theme.colors.primaryVeryLight
                                                : theme.colors.blue
                                        }
                                    />
                                </Pressable>
                            )}
                        </>
                    )}
                </View>
            )}
        </View>
    )
}

const styles = (theme: Theme, insets: Insets) =>
    StyleSheet.create({
        container: {
            width: '100%',
            flexDirection: 'column',
            marginTop: 'auto',
            backgroundColor: theme.colors.secondary,
            borderTopColor: theme.colors.primaryVeryLight,
            borderTopWidth: 1,
            paddingTop: theme.spacing.sm,
            paddingLeft: theme.spacing.md + (insets.left || 0),
            paddingRight: theme.spacing.md + (insets.right || 0),
            paddingBottom: Math.max(theme.spacing.sm, insets.bottom || 0),
            position: 'relative',
            gap: theme.spacing.lg,
        },
        noRoomContainer: {
            paddingBottom: Math.max(theme.spacing.lg, insets.bottom || 0),
        },
        buttonContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        chatControls: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.lg,
        },
        sendButton: {
            flexShrink: 0,
        },
        textInputInner: {
            borderBottomWidth: 0,
        },
        textInputOuter: {
            borderWidth: 0,
            paddingHorizontal: 0,
            backgroundColor: theme.colors.white,
            flexGrow: 1,
            flexShrink: 1,
            flexBasis: 0,
        },
        textInputStyle: {
            fontSize: fediTheme.fontSizes.body,
        },
        textInputReadonly: {
            color: theme.colors.grey,
            fontSize: fediTheme.fontSizes.body,
            textAlign: 'center',
        },
        attachmentContainer: {
            flexDirection: 'column',
            gap: theme.spacing.sm,
        },
        attachment: {
            padding: theme.spacing.sm,
            borderRadius: 8,
            backgroundColor: theme.colors.offWhite,
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
        },
        attachmentIcon: {
            width: 48,
            height: 48,
            padding: theme.spacing.md,
            backgroundColor: theme.colors.extraLightGrey,
            borderRadius: 8,
        },
        attachmentContent: {
            flex: 1,
            flexDirection: 'column',
            display: 'flex',
            gap: theme.spacing.xs,
        },
        attachmentSize: {
            color: theme.colors.darkGrey,
        },
        removeButton: {
            justifyContent: 'center',
            alignItems: 'center',
            position: 'absolute',
            top: 8,
            right: 8,
            width: 16,
            height: 16,
            borderRadius: 16,
            backgroundColor: theme.colors.night,
        },
        inputContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.spacing.lg,
        },
        saveButton: {
            flexShrink: 0,
            width: 24,
            height: 24,
            backgroundColor: theme.colors.blue,
            borderRadius: 24,
            color: theme.colors.white,
            alignItems: 'center',
            justifyContent: 'center',
        },
        cancelButton: {
            flexShrink: 0,
            width: 24,
            height: 24,
            backgroundColor: theme.colors.red,
            borderRadius: 12,
            color: theme.colors.white,
            alignItems: 'center',
            justifyContent: 'center',
        },
        editButtonsEnd: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: theme.spacing.md,
        },
    })

export default MessageInput
