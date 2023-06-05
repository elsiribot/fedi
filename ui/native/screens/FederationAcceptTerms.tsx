import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import { compile } from 'html-to-text'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'

import {
    selectActiveFederation,
    selectAuthenticatedMember,
    selectChatConnectionOptions,
} from '@fedi/common/redux'

import { useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

const options = {
    wordwrap: 130,
}

const compiledConvert = compile(options)

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'FederationAcceptTerms'
>

const FederationAcceptTerms: React.FC<Props> = ({ navigation }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const activeFederation = useAppSelector(selectActiveFederation)
    const activeChatConnectionOptions = useAppSelector(
        selectChatConnectionOptions,
    )
    const authenticatedMember = useAppSelector(selectAuthenticatedMember)
    // Define a new state variable to hold the fetched terms content
    const [termsContent, setTermsContent] = useState<string>('')

    useEffect(() => {
        if (activeFederation?.meta.tos_url) {
            fetch(activeFederation?.meta.tos_url)
                .then(response => response.text())
                .then(data => {
                    // Parse the HTML data
                    const text = compiledConvert(data)

                    setTermsContent(text)
                })
        }
    }, [activeFederation])

    return (
        <View style={styles(theme).container}>
            <Text h2 medium h2Style={styles(theme).title}>
                {t('feature.onboarding.terms-and-conditions')}
            </Text>
            <ScrollView style={styles(theme).termsContainer}>
                <Text caption style={styles(theme).content}>
                    {termsContent}
                </Text>
            </ScrollView>
            <View style={styles(theme).buttonsContainer}>
                <Button
                    fullWidth
                    title={t('feature.onboarding.i-accept')}
                    onPress={() => {
                        if (
                            activeChatConnectionOptions &&
                            authenticatedMember === null
                        ) {
                            navigation.navigate('CreateUsername')
                        } else {
                            navigation.navigate('TabsNavigator')
                        }
                    }}
                    containerStyle={styles(theme).button}
                />
                <Button
                    fullWidth
                    type="clear"
                    title={t('feature.onboarding.i-do-not-accept')}
                    onPress={() => {
                        navigation.goBack()
                    }}
                    containerStyle={styles(theme).button}
                />
            </View>
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
            marginVertical: theme.sizes.xxs,
        },
        buttonsContainer: {
            paddingTop: theme.spacing.md,
            marginTop: 'auto',
            width: '100%',
            alignItems: 'center',
        },
        termsContainer: {
            width: '100%',
        },
        title: {
            marginBottom: theme.spacing.lg,
            textAlign: 'left',
            alignSelf: 'flex-start',
        },
        content: {
            textAlign: 'left',
            lineHeight: 20,
        },
    })

export default FederationAcceptTerms
