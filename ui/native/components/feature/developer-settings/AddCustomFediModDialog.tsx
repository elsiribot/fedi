import { Button, Dialog, Input, Text, useTheme, Theme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
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
                site: {
                    id: `custom-${Date.now()}`,
                    title,
                    url,
                },
            }),
        )
        toast?.show('Custom site added', 3000)
        onClose()
    }

    const style = styles(theme)
    const isValid = !!federationId && !!title && !!url

    return (
        <Dialog isVisible={isVisible} onBackdropPress={onClose}>
            <View style={style.container}>
                <Text h2 style={style.title}>
                    Add custom site
                </Text>
                <Input
                    placeholder="Site title"
                    value={title}
                    onChangeText={setTitle}
                />
                <Input
                    placeholder="Site URL"
                    value={url}
                    onChangeText={setUrl}
                    autoCapitalize={'none'}
                    autoCorrect={false}
                />
                <Button disabled={!isValid} onPress={handleSubmit}>
                    Save
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
