import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Input, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    Keyboard,
    KeyboardEvent,
    Platform,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native'
import { useSafeAreaInsets, EdgeInsets } from 'react-native-safe-area-context'

import { useToast } from '@fedi/common/hooks/toast'
import { selectMatrixAuth, setMatrixDisplayName } from '@fedi/common/redux'
import { formatErrorMessage } from '@fedi/common/utils/format'
import { makeLog } from '@fedi/common/utils/log'

import { useAppDispatch, useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

const log = makeLog('CreateUsername')

export type Props = NativeStackScreenProps<RootStackParamList, 'CreateUsername'>

const CreateUsername: React.FC<Props> = ({ navigation }: Props) => {
    const insets = useSafeAreaInsets()
    const { theme } = useTheme()
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const toast = useToast()
    const [username, setUsername] = useState<string>('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [buttonIsOverlapping, setButtonIsOverlapping] =
        useState<boolean>(false)
    const [keyboardHeight, setKeyboardHeight] = useState<number>(0)
    const [buttonYPosition, setButtonYPosition] = useState<number>(0)
    const [overlapThreshold, setOverlapThreshold] = useState<number>(0)

    const matrixAuth = useAppSelector(selectMatrixAuth)

    useEffect(() => {
        if (!matrixAuth) return
        const { displayName, userId } = matrixAuth
        if (!userId.includes(displayName)) {
            setUsername(displayName)
        }
    }, [matrixAuth])

    // when the keyboard is opened and content layouts change, this effect
    // determines whether the Create username button is overlapping with
    // the input wrapper.
    useEffect(() => {
        if (
            keyboardHeight > 0 &&
            buttonYPosition > 0 &&
            overlapThreshold > 0 &&
            buttonYPosition < overlapThreshold
        ) {
            setButtonIsOverlapping(true)
        }
        // when keyboard closes be sure to reset buttonIsOverlapping
        // state so the button remains flexed to the bottom of the view
        if (keyboardHeight === 0 && buttonIsOverlapping === true) {
            setButtonIsOverlapping(false)
        }
    }, [buttonIsOverlapping, buttonYPosition, overlapThreshold, keyboardHeight])

    useEffect(() => {
        const keyboardShownListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e: KeyboardEvent) => {
                setKeyboardHeight(e.endCoordinates.height)
            },
        )
        const keyboardHiddenListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                setKeyboardHeight(0)
            },
        )

        return () => {
            keyboardShownListener.remove()
            keyboardHiddenListener.remove()
        }
    }, [])

    const handleSubmit = async () => {
        setIsSubmitting(true)
        try {
            await dispatch(
                setMatrixDisplayName({ displayName: username }),
            ).unwrap()
            navigation.reset({
                index: 0,
                routes: [{ name: 'FederationGreeting' }],
            })
        } catch (err) {
            log.error('handleSubmit', err)
            const errorMessage = formatErrorMessage(t, err)
            toast?.show(errorMessage)
        }
        setIsSubmitting(false)
    }

    const handleUsernameChange = (input: string) => {
        const isValid = /^[^"&'/:<>\s]+$|^$/.test(input)
        if (!isValid) {
            toast.show({
                content: t('errors.invalid-character'),
                status: 'error',
            })
        } else {
            setUsername(input)
        }
    }

    const style = styles(theme, insets)

    return (
        <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
                style.container,
                keyboardHeight > 0 && Platform.OS === 'ios'
                    ? { paddingBottom: keyboardHeight + theme.spacing.xl }
                    : {},
                buttonIsOverlapping ? { flex: 0 } : {},
            ]}>
            <Text h2 medium style={style.titleText}>
                {t('feature.onboarding.create-your-username')}
            </Text>
            <Text caption style={style.instructionsText}>
                {t('feature.onboarding.username-instructions')}
            </Text>
            <View
                style={style.inputWrapper}
                onLayout={event => {
                    setOverlapThreshold(
                        event.nativeEvent.layout.height +
                            event.nativeEvent.layout.y,
                    )
                }}>
                <Text caption style={style.inputLabel}>
                    {t('words.username')}
                </Text>
                <Input
                    onChangeText={input => {
                        handleUsernameChange(input)
                    }}
                    value={username}
                    placeholder={`${t('feature.onboarding.enter-username')}...`}
                    returnKeyType="done"
                    containerStyle={style.textInputOuter}
                    inputContainerStyle={style.textInputInner}
                    autoCapitalize={'none'}
                    autoCorrect={false}
                    disabled={isSubmitting}
                />
                <Text caption style={style.inputGuidance}>
                    {t('feature.onboarding.username-guidance')}
                </Text>
            </View>
            <View
                style={[
                    style.buttonContainer,
                    buttonIsOverlapping ? { marginTop: theme.sizes.md } : {},
                ]}
                onLayout={event => {
                    setButtonYPosition(event.nativeEvent.layout.y)
                }}>
                <Button
                    fullWidth
                    title={t('feature.onboarding.create-username')}
                    onPress={handleSubmit}
                    disabled={!username || isSubmitting}
                    loading={isSubmitting}
                />
            </View>
        </ScrollView>
    )
}

const styles = (theme: Theme, insets: EdgeInsets) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: theme.spacing.xl,
            paddingBottom: Math.max(theme.spacing.xl, insets.bottom || 0),
        },
        buttonContainer: {
            marginTop: 'auto',
            width: '100%',
        },
        instructionsText: {
            marginVertical: theme.spacing.md,
            textAlign: 'center',
        },
        titleText: {
            textAlign: 'center',
        },
        inputWrapper: {
            width: '100%',
            marginTop: theme.spacing.xl,
        },
        inputLabel: {
            textAlign: 'left',
            marginLeft: theme.spacing.sm,
            marginBottom: theme.spacing.xs,
        },
        textInputInner: {
            borderBottomWidth: 0,
            height: '100%',
        },
        textInputOuter: {
            width: '100%',
            borderColor: theme.colors.primaryVeryLight,
            borderWidth: 1,
            borderRadius: theme.borders.defaultRadius,
        },
        inputGuidance: {
            textAlign: 'left',
            marginLeft: theme.spacing.sm,
            marginTop: theme.spacing.xs,
            color: theme.colors.grey,
        },
        loadingContainer: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
    })

export default CreateUsername
