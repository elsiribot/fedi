import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, StyleSheet, View } from 'react-native'
import Hyperlink from 'react-native-hyperlink'

import { selectActiveFederation } from '@fedi/common/redux'

import { useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'FederationAcceptTerms'
>

const FederationAcceptTerms: React.FC<Props> = ({
    navigation,
    route,
}: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const { params } = route
    const nextScreen: keyof RootStackParamList = params.nextScreen
    const activeFederation = useAppSelector(selectActiveFederation)

    return (
        <View style={styles(theme).container}>
            <Text h2 medium h2Style={styles(theme).title}>
                {t('feature.onboarding.terms-and-conditions')}
            </Text>

            <View style={styles(theme).guidance}>
                <Hyperlink
                    onPress={url => Linking.openURL(url)}
                    linkStyle={styles(theme).linkText}>
                    <Text>
                        {t('feature.onboarding.by-clicking-i-accept', {
                            tos_url: activeFederation?.meta?.tos_url,
                        })}
                    </Text>
                </Hyperlink>
            </View>

            <View style={styles(theme).buttonsContainer}>
                <Button
                    fullWidth
                    title={t('feature.onboarding.i-accept')}
                    onPress={() => {
                        navigation.navigate(nextScreen)
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
            width: '100%',
            alignItems: 'center',
        },
        guidance: {
            marginTop: 'auto',
            marginBottom: theme.spacing.lg,
        },
        termsContainer: {
            width: '100%',
        },
        title: {
            marginBottom: theme.spacing.lg,
            textAlign: 'left',
            alignSelf: 'flex-start',
        },
        linkText: {
            color: theme.colors.link,
        },
        content: {
            textAlign: 'left',
            lineHeight: 20,
        },
    })

export default FederationAcceptTerms
