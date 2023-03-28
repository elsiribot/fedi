import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Card, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import SvgImage, { SvgImageSize } from '../components/ui/SvgImage'
import { useFederationsContext } from '../state/contexts/FederationsContext'

import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'FederationWelcome'
>

const FederationWelcome: React.FC<Props> = ({ navigation }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const { selectedFederation } = useFederationsContext().state

    return (
        <View style={styles(theme).container}>
            <Card containerStyle={styles(theme).roundedCardContainer}>
                <View style={styles(theme).innerCardContainer}>
                    <SvgImage
                        name="FedearationxIcon"
                        size={SvgImageSize.xl}
                        svgProps={{
                            stroke: 'transparent',
                        }}
                    />
                    {/*refer to below image style for above image*/}
                    <Text h2 medium style={styles(theme).welcome}>
                        {t('feature.onboarding.welcome-to-federation')}
                    </Text>
                    <Text h2 medium style={styles(theme).welcomeTitle}>
                        {selectedFederation?.name}
                    </Text>
                    <Text caption style={styles(theme).welcomeText}>
                        {/*
                        TODO: Is this welcome text customizable by the
                        federation? If so, fetch from bridge
                    */}
                        {t('feature.onboarding.welcome-instructions')}
                    </Text>
                </View>
            </Card>
            <View style={styles(theme).buttonsContainer}>
                <Button
                    fullWidth
                    type="clear"
                    title={t('feature.onboarding.join-returning-member')}
                    onPress={() => {
                        navigation.navigate('ChooseRecoveryMethod')
                    }}
                    containerStyle={styles(theme).button}
                />
                <Button
                    fullWidth
                    title={t('feature.onboarding.join-new-member')}
                    onPress={() => {
                        navigation.navigate('CreateUsername')
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
            marginTop: 'auto',
            width: '100%',
            alignItems: 'center',
        },
        image: {
            height: 100,
            width: 100,
            resizeMode: 'contain',
        },
        roundedCardContainer: {
            marginTop: 'auto',
            borderRadius: theme.borders.defaultRadius,
            width: '100%',
            marginHorizontal: 0,
            padding: theme.spacing.xl,
        },
        innerCardContainer: {
            alignItems: 'center',
        },
        welcome: {
            marginTop: theme.spacing.md,
            textAlign: 'center',
        },
        welcomeTitle: {
            marginBottom: theme.spacing.md,
            textAlign: 'center',
        },
        welcomeText: {
            textAlign: 'center',
        },
    })

export default FederationWelcome
