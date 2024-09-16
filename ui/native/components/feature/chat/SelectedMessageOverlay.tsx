import { useToast } from '@fedi/common/hooks/toast'
import {
    selectSelectedChatMessage,
    setMessageToEdit,
    setSelectedChatMessage,
} from '@fedi/common/redux'
import Clipboard from '@react-native-clipboard/clipboard'
import { Text, Theme, useTheme } from '@rneui/themed'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { fedimint } from '../../../bridge'
import { useAppDispatch, useAppSelector } from '../../../state/hooks'
import CustomOverlay from '../../ui/CustomOverlay'
import { OptionalGradient } from '../../ui/OptionalGradient'
import { Pressable } from '../../ui/Pressable'
import SvgImage from '../../ui/SvgImage'
import { bubbleGradient } from './ChatEvent'
import MessageContents from './MessageContents'

const SelectedMessageOverlay: React.FC = () => {
    const [deleteMessage, setDeleteMessage] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const selectedMessage = useAppSelector(selectSelectedChatMessage)
    const dispatch = useAppDispatch()
    const { t } = useTranslation()
    const { theme } = useTheme()
    const toast = useToast()

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
        if (!selectedMessage) return

        Clipboard.setString(selectedMessage.content.body)
        closeOverlay()
        toast.show({
            content: t('phrases.copied-to-clipboard'),
            status: 'success',
        })
    }, [t, toast, closeOverlay, selectedMessage])

    const handleEdit = useCallback(() => {
        dispatch(setMessageToEdit(selectedMessage))
        closeOverlay()
    }, [dispatch, closeOverlay, selectedMessage])

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
                            <OptionalGradient
                                gradient={bubbleGradient}
                                style={style.messageBubble}>
                                <MessageContents
                                    content={
                                        selectedMessage?.content.body || ''
                                    }
                                    sentByMe={true}
                                    textStyles={[styles(theme).outgoingText]}
                                />
                            </OptionalGradient>
                        </View>
                        <Text medium>
                            {t('feature.chat.confirm-delete-message')}
                        </Text>
                    </View>
                ) : (
                    <View style={style.optionsContainer}>
                        <Pressable
                            onPress={handleCopy}
                            containerStyle={style.action}>
                            <SvgImage name="Copy" />
                            <Text bold>{t('phrases.copy-text')}</Text>
                        </Pressable>
                        <Pressable
                            onPress={handleEdit}
                            containerStyle={style.action}>
                            <SvgImage name="Edit" />
                            <Text bold>{t('words.edit')}</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => setDeleteMessage(true)}
                            containerStyle={style.action}>
                            <SvgImage color={theme.colors.red} name="Trash" />
                            <Text bold style={style.danger}>
                                {t('words.delete')}
                            </Text>
                        </Pressable>
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
    })

export default SelectedMessageOverlay
