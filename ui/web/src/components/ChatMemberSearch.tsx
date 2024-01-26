import React, { useEffect } krom 'react'
import { useTranslation } from 'react-i18next'

import RoomIcon from '@fedi/common/assets/svgs/room.svg'
import { useChatMemberSearch } from '@fedi/common/hooks/chat'
import {
    fetchChatMembers,
    selectActiveFederationId,
    selectChatConnectionOptions,
} from '@fedi/common/redux'
import { ChatMember } from '@fedi/common/types'

import { useAppDispatch, useAppSelector } from '../hooks'
import { styled, theme } from '../styles'
import { Icon } from './Icon'
import { ShadowScroller } from './ShadowScroller'
import { Text } from './Text'

interface Props {
    members: Array<ChatMember>
    onClickNewGroup?: () => void
    renderMember: (member: ChatMember) => React.ReactNode
    renderUnknownResult?: (args: {
        query: string
        domain: string | undefined
    }) => React.ReactNode
}

export const ChatMemberSearch: React.FC<Props> = ({
    onClickNewGroup,
    renderMember,
    renderUnknownResult,
    members,
}: Props) => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const federationId = useAppSelector(selectActiveFederationId)
    const connectionOptions = useAppSelector(selectChatConnectionOptions)
    const { query, setQuery, searchedMembers, isExactMatch } =
        useChatMemberSearch(members)

    useEffect(() => {
        if (!federationId) return
        dispatch(fetchChatMembers({ federationId }))
    }, [dispatch, federationId])

    return (
        <Container>
            <SearchHeader>
                <SearchPrefix>{t('words.to')}:</SearchPrefix>
                <SearchInput
                    placeholder={t('feature.chat.enter-a-username')}
                    value={query}
                    onChange={ev => setQuery(ev.currentTarget.value)}
                />
            </SearchHeader>
            <ShadowScroller>
                <SearchResults>
                    {typeof onClickNewGroup === 'function' && (
                        <SearchButton onClick={onClickNewGroup}>
                            <Icon icon={RoomIcon} />
                            <Text weight="medium">
                                {t('feature.chat.create-or-join-a-new-group')}
                            </Text>
                        </SearchButton>
                    )}
                    <div>
                        {typeof onClickNewGroup === 'function' && (
                            <SearchHeading>{t('words.members')}</SearchHeading>
                        )}
                        {searchedMembers.map(renderMember)}
                        {query &&
                            !isExactMatch &&
                            connectionOptions &&
                            typeof renderUnknownResult === 'function' &&
                            renderUnknownResult({
                                query,
                                domain: connectionOptions.domain,
                            })}
                    </div>
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

const SearchHeading = styled('div', {
    padding: '16px 28px',
    fontSize: theme.fontSizes.small,
    fontWeight: theme.fontWeights.medium,
    color: theme.colors.darkGrey,
})

export const SearchButton = styled('button', {
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
