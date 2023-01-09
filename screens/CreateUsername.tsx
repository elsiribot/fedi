import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Input, Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import {
    updateFederationUsername,
    useFederationsContext,
} from '../state/contexts/FederationsContext'
import { useXmpp } from '../state/hooks'

import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'CreateUsername'>

const CreateUsername: React.FC<Props> = ({ navigation }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const [username, setUsername] = useState<string>('')
    const { dispatch } = useFederationsContext()
    const { registerUser } = useXmpp()

    const handleSubmit = async () => {
        try {
            await registerUser(username)
            dispatch(updateFederationUsername(username))
            navigation.replace('FederationGreeting')
        } catch (error) {
            console.log(error)
        }
    }

    return (
        <View style={styles(theme).container}>
            <Text h2 medium style={styles(theme).titleText}>
                {t('feature.onboarding.create-your-username')}
            </Text>
            <Text caption style={styles(theme).instructionsText}>
                {t('feature.onboarding.username-instructions')}
            </Text>
            <View style={styles(theme).inputWrapper}>
                <Text caption style={styles(theme).inputLabel}>
                    {t('words.username')}
                </Text>
                <Input
                    onChangeText={setUsername}
                    value={username}
                    placeholder={`${t('feature.onboarding.enter-username')}...`}
                    returnKeyType="done"
                    containerStyle={styles(theme).textInputOuter}
                    inputContainerStyle={styles(theme).textInputInner}
                    autoCapitalize={'none'}
                    autoCorrect={false}
                />
            </View>
            <Button
                fullWidth
                title={t('feature.onboarding.create-username')}
                onPress={handleSubmit}
                disabled={!username}
                containerStyle={styles(theme).button}
            />
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing.xl,
        },
        button: {
            marginTop: 'auto',
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
    })

export default CreateUsername
