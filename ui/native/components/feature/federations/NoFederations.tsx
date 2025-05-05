import { useNavigation } from '@react-navigation/native'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Image, ScrollView, StyleSheet, View } from 'react-native'

import { useLatestPublicFederations } from '@fedi/common/hooks/federation'
import { Images } from '@fedi/native/assets/images'

import Flex from '../../ui/Flex'
import SvgImage from '../../ui/SvgImage'
import { FederationLogo } from './FederationLogo'

const AWESOME_FEDIMINT_LINK = 'https://github.com/fedimint/awesome-fedimint'

const NoFederations: React.FC = () => {
    const { t } = useTranslation()
    const navigation = useNavigation()
    const { theme } = useTheme()
    const { publicFederations } = useLatestPublicFederations()

    const style = styles(theme)

    const onOpenAwesomeFedimint = () => {
        navigation.navigate('FediModBrowser', {
            url: AWESOME_FEDIMINT_LINK,
        })
    }

    return (
        <ScrollView
            contentContainerStyle={style.container}
            alwaysBounceVertical={false}>
            <Image style={style.image} source={Images.AwesomeFedimint} />
            <View style={style.titleContainer}>
                <Text h2 medium>
                    {t('feature.federation.join-a-federation')}
                </Text>
                <Text style={style.subtitle}>
                    {t('feature.federation.join-federation-guidance')}
                </Text>
            </View>
            <Flex gap="xl" fullWidth justify="end">
                {publicFederations.map(f => {
                    return (
                        <Flex
                            row
                            align="center"
                            gap="md"
                            key={f.id}
                            style={style.tileContainer}>
                            <View style={{}}>
                                <FederationLogo federation={f} size={40} />
                            </View>
                            <Flex grow gap="xs">
                                <Text numberOfLines={1} medium>
                                    {f.name}
                                </Text>
                                <Text
                                    style={style.previewMessage}
                                    numberOfLines={2}
                                    caption
                                    medium>
                                    {f.meta.preview_message}
                                </Text>
                            </Flex>
                            <Button
                                size="sm"
                                onPress={() =>
                                    navigation.navigate('JoinFederation', {
                                        invite: f.meta.invite_code,
                                    })
                                }
                                title={
                                    <Text small style={[style.joinButtonText]}>
                                        {t('words.join')}
                                    </Text>
                                }
                            />
                        </Flex>
                    )
                })}
                <Flex gap="sm">
                    <Button
                        title={
                            <Text caption medium style={style.joinButtonText}>
                                {t('phrases.add-federation')}
                            </Text>
                        }
                        onPress={() =>
                            navigation.navigate('JoinFederation', {
                                invite: undefined,
                            })
                        }
                    />
                    <Button
                        type="clear"
                        title={
                            <Flex row align="center" gap="sm">
                                <Text caption medium>
                                    {t(
                                        'feature.federation.or-visit-awesome-fedimint',
                                    )}
                                </Text>
                                <SvgImage name="ExternalLink" size={20} />
                            </Flex>
                        }
                        onPress={() => onOpenAwesomeFedimint()}
                    />
                </Flex>
            </Flex>
        </ScrollView>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
            gap: 23,
            padding: theme.spacing.lg,
        },
        titleContainer: {
            gap: 24,
            alignItems: 'center',
            textAlign: 'center',
        },
        image: {
            height: 200,
            width: 200,
        },
        title: {
            textAlign: 'center',
        },
        subtitle: {
            textAlign: 'center',
            lineHeight: 20,
            fontFamily: 'Albert Sans',
            letterSpacing: 0.16,
        },
        tileContainer: {
            backgroundColor: theme.colors.offWhite,
            padding: theme.spacing.md,
            borderRadius: 16,
        },
        previewMessage: { color: theme.colors.primaryLight },
        joinButtonText: {
            color: theme.colors.secondary,
            paddingHorizontal: theme.spacing.xs,
        },
    })

export default NoFederations
