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
        dispatch(
            addCustomFediMod({
                federationId,
                fediMod: {
                    id: `custom-${Date.now()}`,
                    title,
                    url,
                },
            }),
        )
        toast?.show(t('feature.fedimods.custom-fedimod-added'), 3000)
        onClose()
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
                    onChangeText={setUrl}
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
