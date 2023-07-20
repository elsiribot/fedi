import { Button, Dialog, Input, Text, useTheme, Theme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { useDispatch } from 'react-redux'

import { addCustomFediMod, selectActiveFederation } from '@fedi/common/redux'

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

    useEffect(() => {
        if (!isVisible) return
        setTitle('')
        setUrl('')
    }, [isVisible])

    const handleSubmit = () => {
        if (!federationId) return
        try {
            let validUrl = new URL(url).toString()
            if (validUrl.startsWith('http')) {
                dispatch(
                    addCustomFediMod({
                        federationId,
                        fediMod: {
                            id: `custom-${Date.now()}`,
                            title,
                            url: validUrl,
                        },
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
        <Dialog isVisible={isVisible} onBackdropPress={onClose}>
            <View style={style.container}>
                <Text h2 style={style.title}>
                    {t('feature.fedimods.add-custom-fedimod')}
                </Text>
                <Input
                    placeholder={t('feature.fedimods.fedimod-title')}
                    value={title}
                    onChangeText={setTitle}
                />
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
                <Button disabled={!isValid} onPress={handleSubmit}>
                    {t('words.save')}
                </Button>
            </View>
        </Dialog>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            padding: theme.spacing.md,
        },
        title: {
            marginBottom: theme.spacing.lg,
        },
    })
