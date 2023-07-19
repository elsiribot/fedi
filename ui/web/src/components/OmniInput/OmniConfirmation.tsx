import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import BoltIcon from '@fedi/common/assets/svgs/bolt.svg'
import ChatIcon from '@fedi/common/assets/svgs/chat.svg'
import FederationIcon from '@fedi/common/assets/svgs/federation.svg'
import ScanSadIcon from '@fedi/common/assets/svgs/scan-sad.svg'
import { selectActiveFederation } from '@fedi/common/redux'
import { AnyParsedData, ParserDataType } from '@fedi/common/types'
import { lnurlAuth } from '@fedi/common/utils/lnurl'

import { useRouteStateContext } from '../../context/RouteStateContext'
import { useAppSelector, useToast } from '../../hooks'
import { fedimint } from '../../lib/bridge'
import { keyframes, styled } from '../../styles'
import { theme } from '../../styles'
import { Button } from '../Button'
import { Icon } from '../Icon'
import { Text } from '../Text'

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
    const toast = useToast()
    const { pushWithState } = useRouteStateContext()
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
            toast.showErrorToast(err, 'errors.unknown-error')
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
            toast.showErrorToast(err, 'errors.unknown-error')
        }
        setIsLoading(false)
    }

    let icon: React.FunctionComponent<React.SVGAttributes<SVGElement>>
    let text: React.ReactNode
    let continueText = t('words.continue')
    let continueOnClick: undefined | (() => void)
    let continueHref: undefined | string

    switch (parsedData.type) {
        case ParserDataType.Bolt11:
        case ParserDataType.LnurlPay:
            icon = BoltIcon
            text = t('feature.omni.confirm-lightning-pay')
            continueOnClick = () => pushWithState('/send', parsedData)
            break
        case ParserDataType.LnurlWithdraw:
            icon = BoltIcon
            text = t('feature.omni.confirm-lightning-withdraw')
            continueOnClick = () => pushWithState('/request', parsedData)
            break
        case ParserDataType.FedimintInvite:
            icon = FederationIcon
            text = t('feature.omni.confirm-federation-invite')
            continueOnClick = () =>
                pushWithState('/onboarding/join', parsedData)
            break
        case ParserDataType.FedimintEcash:
            icon = BoltIcon
            text = t('feature.omni.confirm-ecash-token')
            continueOnClick = handleRedeemToken
            break
        case ParserDataType.LnurlAuth:
            icon = BoltIcon
            text = t('feature.omni.confirm-lnurl-auth', {
                domain: parsedData.data.domain,
            })
            continueText = t('words.authorize')
            continueOnClick = handleAuth
            break
        case ParserDataType.FediChatGroup:
        case ParserDataType.FediChatMember: {
            icon = ChatIcon
            text = t('feature.omni.confirm-fedi-chat')
            if (parsedData.type === ParserDataType.FediChatGroup) {
                continueHref = `/chat/group/${parsedData.data.id}`
            } else {
                continueHref = `/chat/member/${parsedData.data.id}`
            }
            break
        }
        case ParserDataType.Bolt12:
            icon = ScanSadIcon
            text = t('feature.omni.unsupported-bolt12')
            break
        case ParserDataType.Bip21:
        case ParserDataType.BitcoinAddress:
            icon = ScanSadIcon
            text = t('feature.omni.unsupported-on-chain')
            break
        case ParserDataType.Unknown:
            icon = ScanSadIcon
            text =
                parsedData.data.message || t('feature.omni.unsupported-unknown')
            break
    }

    const hasContinue = Boolean(continueOnClick || continueHref)

    return (
        <Container>
            <Backdrop />
            <Confirmation>
                <Icon icon={icon} size="md" />
                <Text css={{ padding: '0 24px' }} weight="medium">
                    {text}
                </Text>
                <ConfirmationActions>
                    <Button
                        variant={hasContinue ? 'outline' : 'primary'}
                        disabled={isLoading}
                        onClick={() => onGoBack()}>
                        {t('phrases.go-back')}
                    </Button>
                    {hasContinue && (
                        <Button
                            variant="primary"
                            href={continueHref}
                            loading={isLoading}
                            onClick={continueOnClick}>
                            {continueText}
                        </Button>
                    )}
                </ConfirmationActions>
            </Confirmation>
        </Container>
    )
}

const Container = styled('div', {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',

    '@sm': {
        position: 'fixed',
        justifyContent: 'flex-end',
    },
})

const backdropFadeIn = keyframes({
    from: {
        opacity: 0,
    },
    to: {
        opacity: 1,
    },
})

const Backdrop = styled('div', {
    position: 'absolute',
    inset: 0,
    background: theme.colors.secondary,
    zIndex: 1,

    '@sm': {
        background: theme.colors.primary80,
        animation: `${backdropFadeIn} 300ms ease`,
    },
})

const confirmationSlideUp = keyframes({
    from: {
        transform: 'translateY(100%)',
    },
    to: {
        transform: 'translateY(0%)',
    },
})

const Confirmation = styled('div', {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    padding: 24,
    gap: 24,
    zIndex: 2,

    '@sm': {
        background: theme.colors.secondary,
        borderTopRightRadius: 16,
        borderTopLeftRadius: 16,
        animation: `${confirmationSlideUp} 200ms ease 200ms both`,
    },
})

const ConfirmationActions = styled('div', {
    width: '100%',
    display: 'flex',
    gap: 16,

    '& > *': {
        flex: 1,
    },
})
