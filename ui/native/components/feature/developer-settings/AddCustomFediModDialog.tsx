import {
    Button,
    Dialog,
    Input,
    Text,
    useTheme,
    Theme,
    Image,
} from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { useDispatch } from 'react-redux'

import { useDebouncedEffect } from '@fedi/common/hooks/util'
import { addCustomFediMod, selectActiveFederationId } from '@fedi/common/redux'
import { fetchMetadataFromUrl } from '@fedi/common/utils/fedimods'
import { makeLog } from '@fedi/common/utils/log'

import { FediModImages } from '../../../assets/images'
import { useEnvironmentContext } from '../../../state/contexts/EnvironmentContext'
import { useAppSelector } from '../../../state/hooks'

const log = makeLog('AddCustomFediModDialog')

interface Props {
    isVisible: boolean
    onClose: () => void
}

export const AddCustomFediModDialog: React.FC<Props> = ({
    isVisible,
    onClose,
}) => {
    const dispatch = useDispatch()
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { toast } = useEnvironmentContext().state
    const federationId = useAppSelector(selectActiveFederationId)
    const [title, setTitle] = useState('')
    const [url, setUrl] = useState('')
    const [imageUrl, setImageUrl] = useState('')

    useEffect(() => {
        if (!isVisible) return
        setTitle('')
        setUrl('')
    }, [isVisible])

    // Limit title to 30 characters
    useEffect(() => {
        if (title && title.length > 30) {
            setTitle(title.slice(0, 30))
        }
    }, [title])

    // When URL field stops changing input for 500ms, fetch metadata
    // if it is a valid URL
    useDebouncedEffect(
        () => {
            const populateFieldsWithMetadata = async (validUrl: string) => {
                const { fetchedTitle, fetchedIcon } =
                    await fetchMetadataFromUrl(validUrl)
                fetchedTitle && setTitle(fetchedTitle)
                fetchedIcon && setImageUrl(fetchedIcon)
            }
            if (url) {
                const validUrl = new URL(url).toString()
                if (validUrl.startsWith('http')) {
                    populateFieldsWithMetadata(validUrl)
                }
            }
        },
        [url],
        500,
    )

    const handleSubmit = async () => {
        if (!federationId) return
        try {
            const validUrl = new URL(url).toString()
            if (validUrl.startsWith('http')) {
                const newFediMod = {
                    id: `custom-${Date.now()}`,
                    title,
                    url: validUrl,
                    ...(imageUrl ? { imageUrl } : {}),
                }
                dispatch(
                    addCustomFediMod({
                        federationId,
                        fediMod: newFediMod,
                    }),
                )
                toast?.show(t('feature.fedimods.custom-fedimod-added'), 3000)
                onClose()
            } else {
                throw new Error('Invalid protocol')
            }
        } catch (e) {
            log.error('handleSubmit', e)
            toast?.show(t('feature.fedimods.enter-valid-url'), 3000)
        }
    }

    const style = styles(theme)
    const isValid = !!federationId && !!title && !!url

    return (
        <Dialog
            isVisible={isVisible}
            onBackdropPress={onClose}
            overlayStyle={style.overlay}>
            <View style={style.container}>
                <Text style={style.title}>
                    {t('feature.fedimods.add-custom-fedimod')}
                </Text>
                <Input
                    placeholder={t('feature.fedimods.fedimod-url')}
                    value={url}
                    onChangeText={text => {
                        const trimmedText = text.trim()

                        // Check if the user only entered a protocol
                        if (
                            trimmedText === 'https://' ||
                            trimmedText === 'http://'
                        ) {
                            setUrl('')
                            return
                        }

                        // Add 'https://' if no protocol is specified
                        if (
                            !trimmedText.startsWith('https://') &&
                            !trimmedText.startsWith('http://')
                        ) {
                            setUrl(`https://${trimmedText}`)
                        } else {
                            setUrl(trimmedText)
                        }
                    }}
                    autoCapitalize={'none'}
                    autoCorrect={false}
                    containerStyle={style.roundedBorderInput}
                    inputContainerStyle={style.innerInputContainer}
                />
                <Input
                    placeholder={t('feature.fedimods.fedimod-title')}
                    value={title}
                    onChangeText={setTitle}
                    containerStyle={style.roundedBorderInput}
                    inputContainerStyle={style.innerInputContainer}
                />
                <View
                    style={[
                        style.imagePreviewContainer,
                        style.roundedBorderInput,
                    ]}>
                    <Input
                        placeholder={t('feature.fedimods.fedimod-icon')}
                        value={imageUrl}
                        onChangeText={setImageUrl}
                        containerStyle={style.imageOuterInputContainer}
                        inputContainerStyle={style.innerInputContainer}
                    />
                    <Image
                        source={
                            imageUrl ? { uri: imageUrl } : FediModImages.default
                        }
                        style={style.imagePreview}
                        onError={() => setImageUrl('')}
                    />
                </View>
                <Button disabled={!isValid} onPress={handleSubmit}>
                    {t('words.save')}
                </Button>
            </View>
        </Dialog>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        overlay: {
            width: '90%',
        },
        container: {
            padding: theme.spacing.sm,
        },
        title: {
            marginBottom: theme.spacing.md,
        },
        imagePreviewContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: theme.spacing.lg,
        },
        roundedBorderInput: {
            marginTop: theme.spacing.md,
            paddingHorizontal: theme.spacing.md,
            borderColor: theme.colors.primaryVeryLight,
            borderWidth: 1,
            borderRadius: theme.borders.defaultRadius,
        },
        innerInputContainer: {
            borderBottomWidth: 0,
            marginTop: theme.spacing.sm,
        },
        imageOuterInputContainer: {
            width: '80%',
            paddingHorizontal: 0,
        },
        imagePreview: {
            height: 30,
            width: 30,
            marginHorizontal: theme.spacing.md,
        },
    })
