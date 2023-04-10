import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import stringUtils from '@fedi/common/utils/StringUtils'

import HoloAvatar, { AvatarSize } from '../components/ui/HoloAvatar'
import { useFederationsContext } from '../state/contexts/FederationsContext'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'FederationGreeting'
>

const FederationGreeting: React.FC<Props> = ({ navigation }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const { selectedFederation } = useFederationsContext().state

    return (
        <View style={styles(theme).container}>
            <View style={styles(theme).contentContainer}>
                <View style={styles(theme).avatarContainer}>
                    <HoloAvatar
                        size={AvatarSize.lg}
                        title={stringUtils.getInitialsFromName(
                            selectedFederation?.username || '',
                        )}
                    />
                </View>
                <Text h2 medium style={styles(theme).welcomeTitle}>
                    {`${t('feature.onboarding.nice-to-meet-you', {
                        username: selectedFederation?.username,
                    })}!`}
                </Text>
                <Text style={styles(theme).welcomeText}>
                    {t('feature.onboarding.greeting-instructions')}
                </Text>
            </View>
            <Button
                fullWidth
                title={t('feature.onboarding.continue-to-fedi')}
                onPress={() => {
                    navigation.replace('TabsNavigator')
                }}
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
        contentContainer: {
            marginTop: 'auto',
            alignItems: 'center',
        },
        avatarContainer: {
            marginTop: theme.spacing.xl,
            marginBottom: theme.spacing.md,
        },
        roundedCardContainer: {
            marginTop: 'auto',
            borderRadius: theme.borders.defaultRadius,
            width: '100%',
            marginHorizontal: 0,
            padding: theme.spacing.xl,
        },
        welcomeTitle: {
            marginVertical: theme.spacing.md,
            textAlign: 'center',
        },
        welcomeText: {
            textAlign: 'center',
        },
    })

export default FederationGreeting
