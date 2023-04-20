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

import {
    authenticateChat,
    selectActiveFederation,
    selectChatCredentials,
} from '@fedi/common/redux'

import { fedimint } from '../bridge'
import { useChatContext } from '../state/contexts/ChatContext'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'CreateUsername'>

const CreateUsername: React.FC<Props> = ({ navigation }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const activeFederation = useAppSelector(selectActiveFederation)
    const activeChatCredentials = useAppSelector(selectChatCredentials)
    const dispatch = useAppDispatch()
    const { authenticatedMember } = useChatContext().state
    const { toast } = useEnvironmentContext().state
    const [username, setUsername] = useState<string>('')
    const [xmppAuthInProgress, setXmppAuthInProgress] = useState<boolean>(false)
    const [buttonIsOverlapping, setButtonIsOverlapping] =
        useState<boolean>(false)
    const [keyboardHeight, setKeyboardHeight] = useState<number>(0)
    const [buttonYPosition, setButtonYPosition] = useState<number>(0)
    const [overlapThreshold, setOverlapThreshold] = useState<number>(0)

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
        setXmppAuthInProgress(true)
    }

    useEffect(() => {
        const handleXmppRegistration = async () => {
            try {
                console.debug('checking credeitnals')
                await dispatch(
                    authenticateChat({
                        fedimint,
                        federationId: activeFederation!.id,
                        username,
                    }),
                ).unwrap()
            } catch (error) {
                if (error instanceof Error) {
                    console.error(error.toString())
                } else if (typeof error === 'string') {
                    setXmppAuthInProgress(false)
                    const errorMessage = t(error)
                    console.info(errorMessage)
                    toast?.show(errorMessage, 3000)
                }
            }
        }
        if (xmppAuthInProgress === true) {
            handleXmppRegistration()
        }
    }, [dispatch, toast, t, username, xmppAuthInProgress, activeFederation])

    // if we have a successfully authed xmppClient and username set
    // continue to the FederationGreeting screen
    useEffect(() => {
        // TODO: if authenticatedMember is set then chat.credentials
        // is almost certainly also set... so consider reducing this logic
        if (authenticatedMember && activeChatCredentials) {
            setXmppAuthInProgress(false)
            navigation.reset({
                index: 0,
                routes: [{ name: 'FederationGreeting' }],
            })
        }
    }, [authenticatedMember, navigation, activeChatCredentials])

    const handleUsernameChange = (input: string) => {
        const isValid = /^[^"&'/:<>\s]+$|^$/.test(input)
        if (!isValid) {
            toast?.show(t('errors.invalid-character'), 3000)
        } else setUsername(input.toLowerCase())
    }

    return (
        <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
                styles(theme).container,
                keyboardHeight > 0 && Platform.OS === 'ios'
                    ? { paddingBottom: keyboardHeight + theme.spacing.xl }
                    : {},
                buttonIsOverlapping ? { flex: 0 } : {},
            ]}>
            <Text h2 medium style={styles(theme).titleText}>
                {t('feature.onboarding.create-your-username')}
            </Text>
            <Text caption style={styles(theme).instructionsText}>
                {t('feature.onboarding.username-instructions')}
            </Text>
            <View
                style={styles(theme).inputWrapper}
                onLayout={event => {
                    setOverlapThreshold(
                        event.nativeEvent.layout.height +
                            event.nativeEvent.layout.y,
                    )
                }}>
                <Text caption style={styles(theme).inputLabel}>
                    {t('words.username')}
                </Text>
                <Input
                    onChangeText={input => {
                        handleUsernameChange(input)
                    }}
                    value={username}
                    placeholder={`${t('feature.onboarding.enter-username')}...`}
                    returnKeyType="done"
                    containerStyle={styles(theme).textInputOuter}
                    inputContainerStyle={styles(theme).textInputInner}
                    autoCapitalize={'none'}
                    autoCorrect={false}
                    disabled={xmppAuthInProgress}
                />
                <Text caption style={styles(theme).inputGuidance}>
                    {t('feature.onboarding.username-guidance')}
                </Text>
            </View>
            <View
                style={[
                    styles(theme).buttonContainer,
                    buttonIsOverlapping ? { marginTop: theme.sizes.md } : {},
                ]}
                onLayout={event => {
                    setButtonYPosition(event.nativeEvent.layout.y)
                }}>
                <Button
                    fullWidth
                    title={t('feature.onboarding.create-username')}
                    onPress={handleSubmit}
                    disabled={!username || xmppAuthInProgress}
                    loading={xmppAuthInProgress}
                />
            </View>
        </ScrollView>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: theme.spacing.xl,
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
            marginTop: theme.spacing.xs,
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
    })

export default CreateUsername
