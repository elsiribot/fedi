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

import { addCustomFediMod, selectActiveFederation } from '@fedi/common/redux'
import { fetchMetadataFromUrl } from '@fedi/common/utils/fedimods'

import { FediModImages } from '../../../assets/images'
import { useEnvironmentContext } from '../../../state/contexts/EnvironmentContext'
import { useAppSelector } from '../../../state/hooks'

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
    const federationId = useAppSelector(selectActiveFederation)?.id
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

    useEffect(() => {
        const populateFieldsWithMetadata = async (validUrl: string) => {
            const { fetchedTitle, fetchedFavicon } = await fetchMetadataFromUrl(
                validUrl,
            )
            fetchedTitle && setTitle(fetchedTitle)
            fetchedFavicon && setImageUrl(fetchedFavicon)
        }

        if (url) {
            let validUrl = new URL(url).toString()
            if (validUrl.startsWith('http')) {
                populateFieldsWithMetadata(validUrl)
            }
        }
    }, [url])

    const handleSubmit = async () => {
        if (!federationId) return
        try {
            let validUrl = new URL(url).toString()
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
            console.error(e)
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
                <Text h2 style={style.title}>
                    {t('feature.fedimods.add-custom-fedimod')}
                </Text>
                <Input
                    placeholder={t('feature.fedimods.fedimod-url')}
                    value={url}
                    onChangeText={text => {
                        let trimmedText = text.trim()

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
                />
                <Input
                    placeholder={t('feature.fedimods.fedimod-title')}
                    value={title}
                    onChangeText={setTitle}
                />
                <View style={style.imageInputContainer}>
                    <Input
                        placeholder={t('feature.fedimods.fedimod-icon')}
                        value={imageUrl}
                        onChangeText={setImageUrl}
                        containerStyle={style.imageInput}
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
            marginBottom: theme.spacing.lg,
        },
        imageInputContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: theme.spacing.lg,
        },
        imageInput: {
            marginTop: theme.spacing.md,
            width: '80%',
        },
        imagePreview: {
            height: 30,
            width: 30,
            // backgroundColor: 'lightblue',
            marginHorizontal: theme.spacing.md,
        },
    })
