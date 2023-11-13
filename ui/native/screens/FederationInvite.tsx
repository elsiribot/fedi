import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'

import QRScreen from '../components/ui/QRScreen'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'FederationInvite'
>

const FederationInvite: React.FC<Props> = ({ route }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { inviteLink } = route.params

    const style = styles(theme)
    return (
        <QRScreen
            dark
            qrValue={inviteLink}
            copyMessage={t('feature.federations.copied-federation-invite')}
            bottom={
                <Text style={style.inviteLinkNotice} numberOfLines={2}>
                    {t('feature.federations.invite-link-notice')}
                </Text>
            }
        />
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        inviteLinkNotice: {
            color: theme.colors.secondary,
            marginTop: theme.spacing.md,
            marginBottom: theme.spacing.xl,
            textAlign: 'center',
        },
    })

export default FederationInvite
