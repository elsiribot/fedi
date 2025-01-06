import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import { useEffect, useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'

import { useFederationPreview } from '@fedi/common/hooks/federation'
import { RpcEcashInfo } from '@fedi/common/types/bindings'

import { fedimint } from '../../../bridge'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'
import { FederationLogo } from '../federations/FederationLogo'
import FederationPreview from '../onboarding/FederationPreview'

export default function OmniReceiveEcash({
    parsed,
    token,
}: {
    parsed: RpcEcashInfo
    token: string
}) {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const navigation = useNavigation()
    const [showFederationPreview, setShowFederationPreview] =
        useState<boolean>(false)
    const [hasJoinedFederation, setHasJoinedFederation] = useState<boolean>(false)

    const inviteCode = useMemo(() => {
        return parsed.federation_type === 'notJoined'
            ? parsed.federation_invite
            : null
    }, [parsed])

    const { isFetchingPreview, federationPreview, handleCode, handleJoin } =
        useFederationPreview(t, fedimint, inviteCode || '')

    useEffect(() => {
        if (!inviteCode) return
        // skip handling the code if we already have a preview
        if (federationPreview) return
        handleCode(inviteCode)
    }, [federationPreview, inviteCode, handleCode])

    const style = styles(theme)

    // The OmniConfirmation component will show unless the content is falsy
    // Once the federation has been joined, close the overlay and move on to the next screen
    if (hasJoinedFederation) return null

    let content: React.ReactNode

    if (parsed.federation_type === 'joined') {
        content = <Text>{t('feature.omni.confirm-ecash-token')}</Text>
    }

    // In case the ecash generated does not include an invite code
    if (!inviteCode) {
        content = <Text>{t('errors.unknown-ecash-issuer')}</Text>
    }

    if (isFetchingPreview) {
        content = <ActivityIndicator />
    }

    if (federationPreview && showFederationPreview) {
        content = (
            <FederationPreview
                onJoin={() =>
                    handleJoin(() => {
                        setHasJoinedFederation(true)
                        navigation.navigate('ConfirmReceiveOffline', {
                            ecash: token,
                        })
                    })
                }
                onBack={() => setShowFederationPreview(false)}
                federation={federationPreview}
            />
        )
    } else if (federationPreview) {
        content = (
            <Pressable
                style={style.actionCardContainer}
                onPress={() => setShowFederationPreview(true)}>
                <View style={style.iconContainer}>
                    <FederationLogo federation={federationPreview} size={32} />
                </View>
                <View style={style.actionCardTextContainer}>
                    <Text medium>
                        {t('feature.receive.join-new-federation')}
                    </Text>
                    <Text caption style={style.darkGrey}>
                        <Trans
                            t={t}
                            i18nKey="feature.receive.join-to-receive"
                            values={{
                                federation: federationPreview.name,
                            }}
                            components={{
                                bold: (
                                    <Text caption bold style={style.darkGrey} />
                                ),
                            }}
                        />
                    </Text>
                </View>
                <View style={style.arrowContainer}>
                    <SvgImage name="ArrowRight" size={SvgImageSize.sm} />
                </View>
            </Pressable>
        )
    }

    return <View style={style.container}>{content}</View>
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: theme.spacing.xl,
        },
        optionsList: {
            paddingTop: theme.spacing.md,
            alignItems: 'flex-start',
            width: '100%',
            gap: 16,
        },
        actionCardContainer: {
            padding: theme.spacing.md,
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.colors.offWhite,
            borderRadius: 16,
            gap: 10,
        },
        actionCardTextContainer: { alignItems: 'flex-start', gap: 2 },
        iconContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            height: 40,
            width: 40,
        },
        roundIconContainer: {
            borderRadius: 20,
        },
        arrowContainer: { marginLeft: 'auto' },
        darkGrey: { color: theme.colors.darkGrey },
    })
