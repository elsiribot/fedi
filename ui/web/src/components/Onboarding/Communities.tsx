import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import ClipboardIcon from '@fedi/common/assets/svgs/clipboard.svg'
import { useToast } from '@fedi/common/hooks/toast'
import {
    selectActiveFederationId,
    selectIsInternetUnreachable,
    selectHasSetMatrixDisplayName,
    selectIsMatrixReady,
    setMatrixDisplayName,
    startMatrixClient,
} from '@fedi/common/redux'
import { ParserDataType } from '@fedi/common/types'
import { generateRandomDisplayName } from '@fedi/common/utils/chat'
import { parseUserInput } from '@fedi/common/utils/parser'

import { Button } from '../../components/Button'
import { ContentBlock } from '../../components/ContentBlock'
import { HorizontalLine } from '../../components/HorizontalLine'
import * as Layout from '../../components/Layout'
import { OmniQrScanner } from '../../components/OmniInput/OmniQrScanner'
import PublicFederations from '../../components/PublicFederations'
import { Switcher } from '../../components/Switcher'
import { Text } from '../../components/Text'
import { useAppSelector, useAppDispatch } from '../../hooks'
import { fedimint } from '../../lib/bridge'
import { keyframes, styled, theme } from '../../styles'
import { HoloLoader } from '../HoloLoader'

type TabValue = 'discover' | 'join' | 'create'

type SwitcherOption = {
    label: string
    value: TabValue
}

const permittedTabs: string[] = ['discover', 'join']
const getTab = (tab: string): TabValue => {
    return permittedTabs.includes(tab) ? (tab as TabValue) : 'discover' // need this typecast
}

export function OnboardingCommunities() {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const toast = useToast()
    const { push, query, replace } = useRouter()

    const federationId = useAppSelector(selectActiveFederationId)
    const isInternetUnreachable = useAppSelector(selectIsInternetUnreachable)
    const hasSetDisplayName = useAppSelector(selectHasSetMatrixDisplayName)
    const isMatrixReady = useAppSelector(selectIsMatrixReady)

    const [activeTab, setActiveTab] = useState<TabValue>('discover')
    const [loading, setLoading] = useState<boolean>(false)
    const [scanning, setScanning] = useState<boolean>(false)

    const switcherOptions: SwitcherOption[] = [
        { label: t('words.discover'), value: 'discover' },
        { label: t('words.join'), value: 'join' },
        // { label: t('words.create'), value: 'create' }, // This will be used at a later date
    ]

    useEffect(() => {
        if (query.tab) {
            setActiveTab(getTab(String(query.tab)))
        }
    }, [query.tab])

    const handleOnChange = (value: string) => {
        replace(`/onboarding/communities?tab=${value}`)
    }

    const parseInput = async (input: string): Promise<string | null> => {
        try {
            const parsedResponse = await parseUserInput(
                input,
                fedimint,
                t,
                federationId,
                isInternetUnreachable,
            )

            if (parsedResponse.type !== ParserDataType.FedimintInvite) {
                throw new Error('Invite code is invalid')
            }

            return parsedResponse.data.invite
        } catch (err) {
            return null
        }
    }

    const handleOnScan = async (input: string) => {
        try {
            setScanning(true)
            const value = await parseInput(input)
            setScanning(false)

            if (!value) {
                throw new Error(t('errors.invalid-invite-code'))
            }

            handleNavigation(value)
        } catch (err) {
            toast.error(t, 'errors.unknown-error')
        }
    }

    const handleOnPaste = async () => {
        try {
            const input = await navigator.clipboard.readText()

            const value = await parseInput(input)

            if (!value) {
                throw new Error(t('errors.invalid-invite-code'))
            }

            handleNavigation(value)
        } catch (err) {
            toast.error(t, 'errors.unknown-error')
        }
    }

    const handleNavigation = (code: string) => {
        push(`/onboarding/join?invite_code=${code}`)
    }

    const handleOnMaybeLater = async () => {
        setLoading(true)

        try {
            if (!isMatrixReady) {
                await dispatch(startMatrixClient({ fedimint })).unwrap()
            }

            if (!hasSetDisplayName) {
                await dispatch(
                    setMatrixDisplayName({
                        displayName: generateRandomDisplayName(2),
                    }),
                ).unwrap()
            }

            push('/home')
        } catch (err) {
            toast.error(t, err)
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <LoaderContent>
                <HoloLoader size="xl" />
            </LoaderContent>
        )
    }

    let body: React.ReactElement

    if (activeTab === 'join') {
        body = (
            <>
                <OmniQrScanner onScan={handleOnScan} processing={scanning} />
                <HorizontalLine text={t('words.or')} />
                <Button
                    icon={ClipboardIcon}
                    width="full"
                    onClick={handleOnPaste}
                    variant="secondary">
                    {t('feature.federations.paste-federation-code')}
                </Button>
            </>
        )
    } else {
        body = <PublicFederations />
    }

    return (
        <ContentBlock>
            <Layout.Root>
                <Layout.Header back>
                    <Layout.Title subheader>
                        {t('phrases.join-a-community')}
                    </Layout.Title>
                </Layout.Header>
                <Layout.Content>
                    <Content>
                        <TitleWrapper>
                            <Text variant="h2" css={{ marginBottom: 0 }}>
                                {t('feature.home.community-title')}
                            </Text>
                            <Text
                                variant="caption"
                                css={{ color: theme.colors.darkGrey }}>
                                {t('feature.home.community-description')}
                            </Text>
                        </TitleWrapper>
                        <Switcher
                            options={switcherOptions}
                            onChange={handleOnChange}
                            selected={activeTab}
                        />
                        <Body>{body}</Body>
                    </Content>
                </Layout.Content>
                <Layout.Actions>
                    <Button variant="tertiary" onClick={handleOnMaybeLater}>
                        {t('phrases.maybe-later')}
                    </Button>
                </Layout.Actions>
            </Layout.Root>
        </ContentBlock>
    )
}

const fadeIn = keyframes({
    '0%, 30%': { opacity: 0 },
    '100%': { opacity: 1 },
})

const Content = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    textAlign: 'center',
})

const TitleWrapper = styled('div', {})

const Body = styled('div', {
    animation: `${fadeIn} 1s ease`,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
})

const LoaderContent = styled('div', {
    alignItems: 'center',
    display: 'flex',
    height: '100dvh',
    flexDirection: 'column',
    justifyContent: 'center',
    width: '100%',
})
