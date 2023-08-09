import { useNavigation } from '@react-navigation/native'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking } from 'react-native'

import { selectActiveFederation } from '@fedi/common/redux'
import { formatErrorMessage } from '@fedi/common/utils/format'
import { lnurlAuth } from '@fedi/common/utils/lnurl'

import { fedimint } from '../../../bridge'
import { useEnvironmentContext } from '../../../state/contexts/EnvironmentContext'
import { useAppSelector } from '../../../state/hooks'
import { AnyParsedData, ParserDataType } from '../../../types'
import { NavigationHook } from '../../../types/navigation'
import CustomOverlay, { CustomOverlayContents } from '../../ui/CustomOverlay'

interface Props {
    parsedData: AnyParsedData
    onGoBack: () => void
    onSuccess: (parsedData: AnyParsedData) => void
}

export const OmniConfirmation: React.FC<Props> = ({
    parsedData,
    onGoBack,
    onSuccess,
}) => {
    const { t } = useTranslation()
    const { toast } = useEnvironmentContext().state
    const navigation = useNavigation<NavigationHook>()
    const [isLoading, setIsLoading] = useState(false)
    const activeFederationId = useAppSelector(selectActiveFederation)?.id

    const handleAuth = async () => {
        if (!activeFederationId || parsedData.type !== ParserDataType.LnurlAuth)
            return
        setIsLoading(true)
        try {
            await lnurlAuth(fedimint, activeFederationId, parsedData.data)
            onSuccess(parsedData)
        } catch (err) {
            toast?.show(formatErrorMessage(t, err, 'errors.unknown-error'))
        }
        setIsLoading(false)
    }

    const handleRedeemToken = async () => {
        if (
            !activeFederationId ||
            parsedData.type !== ParserDataType.FedimintEcash
        )
            return
        setIsLoading(true)
        try {
            await fedimint.receiveEcash(
                parsedData.data.token,
                activeFederationId,
            )
            onSuccess(parsedData)
        } catch (err) {
            toast?.show(formatErrorMessage(t, err, 'errors.unknown-error'))
        }
        setIsLoading(false)
    }

    let contents: CustomOverlayContents = {
        title: '',
    }
    let continueText = t('words.continue')
    let continueOnPress: undefined | (() => void)

    switch (parsedData.type) {
        case ParserDataType.Bolt11:
        case ParserDataType.LnurlPay:
            contents = {
                icon: 'Bolt',
                title: t('feature.omni.confirm-lightning-pay'),
            }
            continueOnPress = () =>
                navigation.replace('ConfirmSendLightning', { parsedData })
            break
        case ParserDataType.LnurlWithdraw:
            contents = {
                icon: 'Bolt',
                title: t('feature.omni.confirm-lightning-withdraw'),
            }
            continueOnPress = () =>
                navigation.replace('Receive', { parsedData })
            break
        case ParserDataType.FedimintInvite:
            contents = {
                icon: 'Federation',
                title: t('feature.omni.confirm-federation-invite'),
            }
            // TODO: Pass along scanned federation code
            continueOnPress = () => navigation.replace('ScanFederationCode')
            break
        case ParserDataType.FedimintEcash:
            contents = {
                icon: 'Bolt',
                title: t('feature.omni.confirm-ecash-token'),
            }
            continueOnPress = handleRedeemToken
            break
        case ParserDataType.LnurlAuth:
            contents = {
                icon: 'Bolt',
                title: t('feature.omni.confirm-lnurl-auth', {
                    domain: parsedData.data.domain,
                }),
            }
            continueText = t('words.authorize')
            continueOnPress = handleAuth
            break
        case ParserDataType.FediChatGroup:
        case ParserDataType.FediChatMember: {
            contents = {
                icon: 'Chat',
                title: t('feature.omni.confirm-fedi-chat'),
            }
            if (parsedData.type === ParserDataType.FediChatGroup) {
                continueOnPress = () =>
                    navigation.replace('GroupChat', {
                        groupId: parsedData.data.id,
                    })
            } else {
                continueOnPress = () =>
                    navigation.replace('DirectChat', {
                        memberId: parsedData.data.id,
                    })
            }
            break
        }
        case ParserDataType.Website:
            contents = {
                icon: 'Globe',
                url: parsedData.data.url,
                title: t('feature.omni.confirm-website-url'),
            }
            continueOnPress = () => {
                Linking.openURL(parsedData.data.url)
                onSuccess(parsedData)
            }
            break
        case ParserDataType.Bolt12:
            contents = {
                icon: 'ScanSad',
                title: t('feature.omni.unsupported-bolt12'),
            }
            break
        case ParserDataType.Bip21:
        case ParserDataType.BitcoinAddress:
            contents = {
                icon: 'ScanSad',
                title: t('feature.omni.unsupported-on-chain'),
            }
            break
        case ParserDataType.Unknown:
            contents = {
                icon: 'ScanSad',
                title:
                    parsedData.data.message ||
                    t('feature.omni.unsupported-unknown'),
            }
            break
    }

    const buttons = useMemo(() => {
        const b = [
            {
                text: t('phrases.go-back'),
                onPress: () => onGoBack(),
                primary: !continueOnPress,
            },
        ]
        if (continueOnPress) {
            b.push({
                text: continueText,
                onPress: continueOnPress,
                primary: true,
            })
        }
        return b
    }, [continueText, continueOnPress, onGoBack, t])

    return (
        <CustomOverlay
            show={!!contents}
            contents={{ ...contents, buttons }}
            loading={isLoading}
            onBackdropPress={onGoBack}
        />
    )
}
