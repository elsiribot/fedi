import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Linking, StyleSheet, View } from 'react-native'

import { usePopupFederationInfo } from '@fedi/common/hooks/federation'
import { selectActiveFederation } from '@fedi/common/redux'

import { FederationLogo } from '../components/ui/FederationLogo'
import { useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'PopupFederationEnded'
>

const PopupFederationEnded: React.FC<Props> = () => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const activeFederation = useAppSelector(selectActiveFederation)
    const popupInfo = usePopupFederationInfo()

    const style = styles(theme)

    return (
        <View style={styles(theme).container}>
            <View style={style.content}>
                <View style={style.contentSpacing}>
                    <FederationLogo federation={activeFederation} size={72} />
                </View>
                <Text h2 style={style.contentSpacing}>
                    {activeFederation?.name}
                </Text>
                <View style={[style.ended, style.contentSpacing]}>
                    <Text caption bold>
                        {t('feature.popup.ended')}
                    </Text>
                </View>
                <Text caption style={{ textAlign: 'center' }}>
                    <Trans
                        t={t}
                        i18nKey="feature.popup.ended-description"
                        values={{ date: popupInfo?.endsAtText }}
                        components={{ bold: <Text caption bold /> }}
                    />
                </Text>
            </View>

            <View style={styles(theme).buttonsContainer}>
                {activeFederation?.meta.tos_url && (
                    <Button
                        fullWidth
                        type="clear"
                        title={t('phrases.terms-and-conditions')}
                        onPress={() => {
                            Linking.openURL(activeFederation.meta.tos_url!)
                        }}
                        containerStyle={styles(theme).button}
                    />
                )}
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
        content: {
            flex: 1,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '90%',
            maxWidth: 280,
            margin: 'auto',
        },
        contentSpacing: {
            marginBottom: theme.spacing.lg,
        },
        ended: {
            paddingVertical: theme.spacing.xxs,
            paddingHorizontal: theme.spacing.sm,
            backgroundColor: theme.colors.lightGrey,
            color: theme.colors.primary,
            borderRadius: 30,
        },
        button: {
            marginVertical: theme.sizes.xxs,
        },
        buttonsContainer: {
            marginTop: 'auto',
            width: '100%',
            alignItems: 'center',
        },
    })

export default PopupFederationEnded
