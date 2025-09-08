import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, StyleSheet, View } from 'react-native'

import { selectCommunity } from '@fedi/common/redux'
import {
    getFederationTosUrl,
    getFederationWelcomeMessage,
} from '@fedi/common/utils/FederationUtils'

import { FederationLogo } from '../components/feature/federations/FederationLogo'
import { SafeAreaContainer } from '../components/ui/SafeArea'
import { useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'CommunityDetails'
>

const CommunityDetails: React.FC<Props> = ({ route }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { communityId } = route.params
    const community = useAppSelector(s => selectCommunity(s, communityId))

    if (!community) return null

    const welcomeMessage = getFederationWelcomeMessage(community.meta)
    const tosUrl = getFederationTosUrl(community.meta)
    const style = styles(theme)

    return (
        <SafeAreaContainer edges="notop">
            <View style={style.content}>
                <FederationLogo federation={community} size={72} />
                <View style={style.textContainer}>
                    <Text
                        h2
                        medium
                        maxFontSizeMultiplier={1.2}
                        style={style.title}>
                        {community.name}
                    </Text>
                    {welcomeMessage && (
                        <Text
                            medium
                            style={style.textStyle}
                            maxFontSizeMultiplier={1.2}>
                            {welcomeMessage}
                        </Text>
                    )}
                </View>
            </View>
            {tosUrl && (
                <Button
                    bubble
                    fullWidth
                    outline
                    onPress={() => Linking.openURL(tosUrl)}>
                    <Text
                        adjustsFontSizeToFit
                        medium
                        style={style.textStyle}
                        numberOfLines={1}>
                        {t(
                            'feature.communities.community-terms-and-conditions',
                        )}
                    </Text>
                </Button>
            )}
        </SafeAreaContainer>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing.lg,
        },
        content: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
        },
        textContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing.md,
        },
        title: {
            textAlign: 'center',
        },
        textStyle: {
            textAlign: 'center',
        },
    })

export default CommunityDetails
