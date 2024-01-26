import { useTranslation } from 'react-i18next'

import SocialPeopleIcon from '@fedi/common/assets/svgs/social-people.svg'
import {
    addAdminToChatGroup,
    fetchChatMember,
    selectActiveFederationId,
} from '@fedi/common/redux'
import { ChatMember } from '@fedi/common/types'

import { useAppDispatch, useAppSelector, useToast } from '../hooks'
import { styled, theme } from '../styles'
import { Avatar } from './Avatar'
import { ChatMemberSearch, SearchButton } from './ChatMemberSearch'
import { Icon } from './Icon'
import { Text } from './Text'

export default function ChatBroadcastAdminAdd({
    groupId,
    setDialogState,
}: {
    groupId: string
    setDialogState: (
        state:
            | 'settings'
            | 'share'
            | 'broadcast-admins'
            | 'add-broadcast-admin'
            | false,
    ) => void
}) {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const federationId = useAppSelector(selectActiveFederationId)

    const toast = useToast()

    const confirmAddAdmin = async (member: ChatMember) => {
        if (
            federationId &&
            confirm(
                t('feature.chat.confirm-add-admin-to-group', {
                    username: member.username,
                }),
            )
        ) {
            try {
                await dispatch(
                    addAdminToChatGroup({
                        federationId,
                        groupId,
                        memberId: member.id,
                    }),
                ).unwrap()
                setDialogState('broadcast-admins')
            } catch (e) {
                toast?.showErrorToast(e, t('errors.unknown-error'))
            }
        }
    }

    const selectMember = async (member: ChatMember) => {
        if (federationId) {
            try {
                await dispatch(
                    fetchChatMember({ federationId, memberId: member.id }),
                ).unwrap()
                confirmAddAdmin(member)
            } catch {
                toast?.showToast(t('errors.chat-member-not-found'))
            }
        }
    }

    return (
        <Container>
            <ChatMemberSearch
                renderMember={member => (
                    <SearchButton
                        key={member.id}
                        onClick={() => selectMember(member)}>
                        <Avatar
                            id={member.id}
                            size="md"
                            name={member.username}
                        />
                        <Text variant="caption" weight="bold">
                            {member.username}
                        </Text>
                    </SearchButton>
                )}
                renderUnknownResult={({ query, domain }) => (
                    <SearchButton
                        onClick={() =>
                            selectMember({
                                id: `${query}@${domain}`,
                                username: query,
                            } as ChatMember)
                        }>
                        <Icon icon={SocialPeopleIcon} />
                        <Text weight="medium">
                            {t('feature.chat.add-user-as-an-admin', {
                                username: query,
                            })}
                        </Text>
                    </SearchButton>
                )}
            />
        </Container>
    )
}

const Container = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.space.md,
})
