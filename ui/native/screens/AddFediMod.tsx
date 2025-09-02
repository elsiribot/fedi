import { useNavigation } from '@react-navigation/native'
import { Button, Image, Input, Text, Theme, useTheme } from '@rneui/themed'
import React, { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SvgUri } from 'react-native-svg'
import { useDispatch } from 'react-redux'

import { useDebouncedEffect } from '@fedi/common/hooks/util'
import { addCustomMod } from '@fedi/common/redux/mod'
import { tryFetchUrlMetadata } from '@fedi/common/utils/fedimods'
import { makeLog } from '@fedi/common/utils/log'
import { constructUrl } from '@fedi/common/utils/neverthrow'

import { FediModImages } from '../assets/images'
import {
    OmniInput,
    OmniInputAction,
} from '../components/feature/omni/OmniInput'
import Flex from '../components/ui/Flex'
import KeyboardAwareWrapper from '../components/ui/KeyboardAwareWrapper'
import KeyboardStickyView from '../components/ui/KeyboardStickyView'
import { SafeScrollArea } from '../components/ui/SafeArea'
import { ParserDataType } from '../types'
import { useAndroidInputFocus } from '../utils/hooks/keyboard'
import { isAndroidAPI30Plus } from '../utils/layout'

const log = makeLog('AddFediMod')

const AddFediMod: React.FC = () => {
    const { theme } = useTheme()
    const { t } = useTranslation()

    const dispatch = useDispatch()
    const navigation = useNavigation()

    const [url, setUrl] = useState('')
    const [title, setTitle] = useState('')
    const [imageUrl, setImageUrl] = useState('')
    const [isFetching, setIsFetching] = useState(false)
    const [isValidUrl, setIsValidUrl] = useState(false)
    const [action, setAction] = useState<'scan' | 'enter'>('scan')

    const insets = useSafeAreaInsets()
    const style = styles(theme)

    const { focusOffset, handleInputFocus } = useAndroidInputFocus()
    const scrollRef = useRef<ScrollView>(null)

    const handleSubmit = async () => {
        try {
            const validUrl = new URL(
                /^https?:\/\//.test(url) ? url : `https://${url}`,
            ).toString()

            dispatch(
                addCustomMod({
                    fediMod: {
                        id: `custom-${Date.now()}`,
                        title,
                        url: validUrl,
                        ...(imageUrl ? { imageUrl } : {}),
                    },
                }),
            )

            navigation.goBack() // multiple ways we could have been sent here
        } catch (e) {
            log.error('handleSubmit', e)
        }
    }

    const customActions: OmniInputAction[] = useMemo(() => {
        return [
            {
                label: t('feature.omni.action-enter-url'),
                icon: 'Globe',
                onPress: () => setAction('enter'),
            },
        ]
    }, [t])

    useDebouncedEffect(
        () => {
            if (url) {
                constructUrl(/^https?:\/\//.test(url) ? url : `https://${url}`)
                    // If URL construction fails, setIsValidUrl to false
                    .orTee(() => setIsValidUrl(false))
                    // Otherwise, set valid url and start fetching
                    .andTee(() => {
                        setIsValidUrl(true)
                        setIsFetching(true)
                    })
                    .asyncAndThen(tryFetchUrlMetadata)
                    .match(
                        metadata => {
                            setTitle(metadata.title)
                            setImageUrl(metadata.icon)
                            setIsFetching(false)
                        },
                        e => {
                            log.error('Failed to fetch fedi mod metadata', e)
                            setIsFetching(false)
                        },
                    )
            }
        },
        [url],
        500,
    )

    const canSave =
        isValidUrl &&
        !isFetching &&
        title &&
        url &&
        title.length >= 3 &&
        title.length <= 24

    if (action === 'scan') {
        return (
            <OmniInput
                expectedInputTypes={[ParserDataType.Website]}
                onExpectedInput={parsedData => {
                    if (parsedData.type === ParserDataType.Website) {
                        setUrl(parsedData.data.url)
                        setAction('enter')
                    }
                }}
                onUnexpectedSuccess={() => null}
                customActions={customActions}
            />
        )
    }

    return (
        <KeyboardAwareWrapper
            containerStyle={style.container}
            additionalVerticalOffset={insets.top}
            behavior="padding">
            <SafeScrollArea
                ref={scrollRef}
                keyboardShouldPersistTaps="handled"
                contentInsetAdjustmentBehavior="never"
                contentContainerStyle={{
                    flexGrow: 1,
                    paddingHorizontal: theme.spacing.xl,
                    paddingBottom: Platform.OS === 'ios' ? 30 : 0,
                }}
                showsVerticalScrollIndicator={false}
                style={style.container}
                edges={'none'}>
                <View
                    style={[
                        style.inputWrapper,
                        { transform: [{ translateY: -focusOffset }] },
                    ]}>
                    <Flex grow gap="xs">
                        <Input
                            onFocus={handleInputFocus}
                            value={url}
                            onChangeText={setUrl}
                            placeholder={t('words.url')}
                            label={<Text small>{t('words.URL')}</Text>}
                            inputContainerStyle={style.innerInputContainer}
                            containerStyle={style.inputContainer}
                            keyboardType="url"
                            autoCapitalize="none"
                            returnKeyType="done"
                        />
                        <Input
                            onFocus={handleInputFocus}
                            value={title}
                            onChangeText={setTitle}
                            placeholder={t('feature.fedimods.mod-title')}
                            numberOfLines={1}
                            label={
                                <Flex row align="center" justify="between">
                                    <Text small>{t('words.title')}</Text>
                                    {title.length > 0 && (
                                        <Text
                                            small
                                            style={{
                                                color:
                                                    title.length < 3 ||
                                                    title.length > 24
                                                        ? theme.colors.red
                                                        : theme.colors.primary,
                                            }}>
                                            {title.length > 24
                                                ? t('errors.title-too-long')
                                                : title.length < 3 &&
                                                    title.length > 0
                                                  ? t('errors.title-too-short')
                                                  : ''}
                                        </Text>
                                    )}
                                </Flex>
                            }
                            inputContainerStyle={style.innerInputContainer}
                            containerStyle={style.inputContainer}
                            disabled={isFetching}
                            returnKeyType="done"
                        />
                        <Input
                            onFocus={handleInputFocus}
                            value={imageUrl}
                            onChangeText={setImageUrl}
                            label={<Text small>{t('words.icon')}</Text>}
                            inputContainerStyle={style.innerInputContainer}
                            containerStyle={style.inputContainer}
                            keyboardType="url"
                            rightIcon={
                                imageUrl?.endsWith('svg') ? (
                                    <SvgUri
                                        uri={imageUrl}
                                        width={32}
                                        height={32}
                                        fallback={
                                            <Image
                                                source={FediModImages.default}
                                                style={style.previewIcon}
                                            />
                                        }
                                        style={style.previewIcon}
                                    />
                                ) : (
                                    <Image
                                        source={
                                            imageUrl
                                                ? { uri: imageUrl }
                                                : FediModImages.default
                                        }
                                        style={style.previewIcon}
                                    />
                                )
                            }
                            disabled={isFetching}
                            returnKeyType="done"
                        />
                    </Flex>
                </View>
            </SafeScrollArea>
            <KeyboardStickyView
                mode="absolute"
                enabledOnIOS={false}
                enabledOnSmallScreens={false}
                enabledOnMediumScreens={true}
                enabledOnLargeScreens={true}
                offsetOpened={10}>
                <View style={style.buttonContainer}>
                    <Button
                        fullWidth
                        disabled={!canSave}
                        loading={isFetching}
                        onPress={handleSubmit}>
                        {t('words.save')}
                    </Button>
                </View>
            </KeyboardStickyView>
        </KeyboardAwareWrapper>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        buttonContainer: {
            paddingTop: theme.spacing.lg,
            paddingHorizontal: theme.spacing.lg,
            paddingBottom:
                Platform.OS === 'ios'
                    ? theme.spacing.lg
                    : isAndroidAPI30Plus()
                      ? theme.spacing.xl
                      : theme.spacing.md,
        },
        container: {
            flex: 1,
            position: 'relative',
            gap: theme.spacing.xs,
            width: '100%',
        },
        innerInputContainer: {
            marginTop: theme.spacing.xs,
            paddingLeft: theme.spacing.md,
            paddingRight: theme.spacing.xs,
            borderColor: theme.colors.primaryVeryLight,
            borderWidth: 1.5,
            borderRadius: 12,
        },
        inputContainer: {
            paddingHorizontal: 0,
            marginBottom: theme.spacing.lg,
        },
        previewIcon: {
            width: 32,
            height: 32,
        },
        inputWrapper: {
            flex: 1,
        },
    })

export default AddFediMod
