import Link from 'next/link'
import { useRouter } from 'next/router'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import ChevronRightIcon from '@fedi/common/assets/svgs/chevron-right.svg'
import ClipboardIcon from '@fedi/common/assets/svgs/clipboard.svg'
import KeyboardIcon from '@fedi/common/assets/svgs/keyboard.svg'
import QRIcon from '@fedi/common/assets/svgs/qr.svg'
import ScanIcon from '@fedi/common/assets/svgs/scan.svg'
import SocialPeopleIcon from '@fedi/common/assets/svgs/social-people.svg'
import { useChatMemberSearch } from '@fedi/common/hooks/chat'
import { useToast } from '@fedi/common/hooks/toast'
import {
    fetchChatMembers,
    joinChatGroup,
    selectActiveFederationId,
    selectAllChatMembers,
    selectChatConnectionOptions,
} from '@fedi/common/redux'
import { ParserDataType } from '@fedi/common/types'
import { parseUserInput } from '@fedi/common/utils/parser'

import { useAppDispatch, useAppSelector, useMediaQuery } from '../hooks'
import { fedimint } from '../lib/bridge'
import { config, styled, theme } from '../styles'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
import * as Layout from './Layout'
import { OmniQrScanner } from './OmniInput/OmniQrScanner'
import { ShadowScroller } from './ShadowScroller'
import { Text } from './Text'

export const ChatMemberSearch = () => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const federationId = useAppSelector(selectActiveFederationId)
    const members = useAppSelector(selectAllChatMembers)
    const connectionOptions = useAppSelector(selectChatConnectionOptions)
    const { query, setQuery, searchedMembers, isExactMatch } =
        useChatMemberSearch(members)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const toast = useToast()
    const router = useRouter()
    const isSm = useMediaQuery(config.media.sm)

    const [isScanning, setIsScanning] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const isNoSearchResults =
        query &&
        !isExactMatch &&
        connectionOptions &&
        searchedMembers.length === 0

    const parseInput = useCallback(
        async (input: string) => {
            if (!connectionOptions || !federationId) return

            setIsLoading(true)
            const parsedData = await parseUserInput(
                input,
                fedimint,
                t,
                federationId,
            )
            setIsLoading(false)

            if (parsedData.type === ParserDataType.FediChatMember) {
                router.push(
                    `/chat/member/${parsedData.data.id}@${connectionOptions.domain}`,
                )
            } else if (parsedData.type === ParserDataType.FediChatGroup) {
                try {
                    const res = await dispatch(
                        joinChatGroup({ federationId, link: input }),
                    ).unwrap()

                    router.push(`/chat/group/${res.id}`)
                } catch (err) {
                    toast.error(t, err)
                }
            } else {
                toast.show({
                    content: t('feature.omni.unsupported-unknown'),
                    status: 'error',
                })
            }
        },
        [federationId, t, toast, router, connectionOptions, dispatch],
    )

    const handlePaste = useCallback(async () => {
        try {
            const input = await navigator.clipboard.readText()
            await parseInput(input)
        } catch (err) {
            toast.error(t, err, 'errors.unknown-error')
        }
    }, [parseInput, toast, t])

    // Perform a QrScanner scan from an image file, rather than from the QRScanner component
    const handleImageFile = useCallback(
        async (ev: React.ChangeEvent<HTMLInputElement>) => {
            const image = ev.currentTarget.files?.[0]
            if (!image) return
            ev.currentTarget.value = ''
            try {
                const QrScanner = (await import('qr-scanner')).default
                const result = await QrScanner.scanImage(image, {
                    returnDetailedScanResult: true,
                })
                parseInput(result.data)
            } catch (err) {
                toast.error(t, err, 'errors.unknown-error')
            }
            // Reset the input so they can re-select the same file if they wish
        },
        [toast, parseInput, t],
    )

    useEffect(() => {
        if (!federationId) return
        dispatch(fetchChatMembers({ federationId }))
    }, [dispatch, federationId])

    return (
        <Container>
            {isSm && (
                <Layout.Header back="/chat">
                    <Layout.Title subheader>
                        {t('feature.chat.new-message')}
                    </Layout.Title>
                </Layout.Header>
            )}
            {isScanning ? null : (
                <SearchHeader>
                    <SearchPrefix>{t('words.to')}:</SearchPrefix>
                    <SearchInput
                        placeholder={t(
                            'feature.omni.search-placeholder-username',
                        )}
                        value={query}
                        onChange={ev => setQuery(ev.currentTarget.value)}
                    />
                </SearchHeader>
            )}
            <ShadowScroller>
                <SearchResults>
                    {isScanning ? (
                        <ScannerContainer>
                            <OmniQrScanner
                                onScan={parseInput}
                                processing={isLoading}
                            />
                        </ScannerContainer>
                    ) : (
                        <div>
                            <SearchHeading>
                                {t(
                                    isNoSearchResults
                                        ? 'feature.omni.search-no-history-header'
                                        : 'words.people',
                                )}
                            </SearchHeading>
                            {query.length === 0 ? (
                                <RecentMembers>
                                    {members.slice(0, 5).map(member => (
                                        <RecentMemberButton
                                            key={member.id}
                                            onClick={() =>
                                                setQuery(member.username)
                                            }>
                                            <Avatar
                                                id={member.id}
                                                size="md"
                                                name={member.username}
                                            />
                                            <Text
                                                variant="caption"
                                                weight="bold"
                                                ellipsize
                                                css={{
                                                    width: '100%',
                                                    maxWidth: 56,
                                                }}>
                                                {member.username}
                                            </Text>
                                        </RecentMemberButton>
                                    ))}
                                </RecentMembers>
                            ) : (
                                searchedMembers.map(member => (
                                    <SearchButton
                                        as={Link}
                                        key={member.id}
                                        href={`/chat/member/${member.id}`}>
                                        <Avatar
                                            id={member.id}
                                            size="md"
                                            name={member.username}
                                        />
                                        <Text
                                            variant="caption"
                                            weight="bold"
                                            css={{ flex: 1 }}>
                                            {member.username}
                                        </Text>
                                        <Icon icon={ChevronRightIcon} />
                                    </SearchButton>
                                ))
                            )}
                            {isNoSearchResults && (
                                <SearchButton
                                    as={Link}
                                    href={`/chat/member/${query}@${connectionOptions.domain}`}>
                                    <Avatar
                                        id={`${query}@${connectionOptions.domain}`}
                                        size="md"
                                        name={query}
                                    />
                                    <Text
                                        variant="caption"
                                        weight="bold"
                                        css={{ flex: 1 }}>
                                        {query}
                                    </Text>
                                    <Icon icon={ChevronRightIcon} />
                                </SearchButton>
                            )}
                        </div>
                    )}
                    {isScanning ? (
                        <SearchButton onClick={() => setIsScanning(false)}>
                            <Icon icon={KeyboardIcon} />
                            <Text weight="medium">
                                {t('feature.onboarding.enter-username')}
                            </Text>
                        </SearchButton>
                    ) : (
                        <SearchButton onClick={() => setIsScanning(true)}>
                            <Icon icon={ScanIcon} />
                            <Text weight="medium">
                                {t('feature.omni.action-scan')}
                            </Text>
                        </SearchButton>
                    )}
                    <SearchButton onClick={handlePaste}>
                        <Icon icon={ClipboardIcon} />
                        <Text weight="medium">
                            {t('feature.omni.action-paste')}
                        </Text>
                    </SearchButton>
                    <SearchButton onClick={() => fileInputRef.current?.click()}>
                        <Icon icon={QRIcon} />
                        <Text weight="medium">
                            {t('feature.omni.action-upload')}
                        </Text>
                    </SearchButton>
                    <SearchButton as={Link} href="/chat/new/group">
                        <Icon icon={SocialPeopleIcon} />
                        <Text weight="medium">
                            {t('feature.chat.create-a-group')}
                        </Text>
                    </SearchButton>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageFile}
                        style={{ display: 'none' }}
                    />
                </SearchResults>
            </ShadowScroller>
        </Container>
    )
}

const Container = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
})

const SearchHeader = styled('div', {
    display: 'flex',
    alignItems: 'center',
    padding: 24,
    borderBottom: `1px solid ${theme.colors.extraLightGrey}`,

    '@sm': {
        padding: '16px 24px',
    },
})

const SearchPrefix = styled('div', {
    color: theme.colors.darkGrey,
    fontSize: theme.fontSizes.caption,
})

const SearchInput = styled('input', {
    flex: 1,
    background: 'none',
    border: 'none',
    padding: 8,

    '&:hover, &:focus': {
        outline: 'none',
    },
})

const SearchResults = styled('div', {
    height: '100%',
    padding: '8px 0',
    overflow: 'auto',
})

const RecentMembers = styled('div', {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 24px',
})

const RecentMemberButton = styled('button', {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    minWidth: 0,

    '&:hover, &:focus': {
        background: theme.colors.extraLightGrey,
        outline: 'none',
    },
})

const SearchHeading = styled('div', {
    padding: '8px 24px',
    fontSize: theme.fontSizes.small,
    fontWeight: theme.fontWeights.medium,
    color: theme.colors.darkGrey,
})

const SearchButton = styled('button', {
    display: 'flex',
    width: '100%',
    minHeight: 48,
    gap: 12,
    padding: '8px 24px',
    alignItems: 'center',

    '&:hover, &:focus': {
        background: theme.colors.extraLightGrey,
        outline: 'none',
    },
})

const ScannerContainer = styled('div', {
    padding: '8px 24px',
})
