import Link from 'next/link'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import SocialPeopleIcon from '@fedi/common/assets/svgs/social-people.svg'
import { selectAllChatMembers } from '@fedi/common/redux'
import { ChatMember } from '@fedi/common/types'

import { useAppSelector } from '../hooks'
import { Avatar } from './Avatar'
import { ChatJoinOrCreateGroup } from './ChatJoinOrCreateGroup'
import { ChatMemberSearch, SearchButton } from './ChatMemberSearch'
import { Icon } from './Icon'
import { Text } from './Text'

export const ChatNew: React.FC = () => {
    const { t } = useTranslation()

    const members = useAppSelector(selectAllChatMembers)

    const [isNewGrouping, setIsNewGrouping] = useState(false)

    let content: React.ReactNode
    if (isNewGrouping) {
        content = <ChatJoinOrCreateGroup />
    } else {
        content = (
            <ChatMemberSearch
                members={members}
                onClickNewGroup={() => setIsNewGrouping(true)}
                renderMember={(member: ChatMember) => (
                    <SearchButton
                        as={Link}
                        key={member.id}
                        href={`/chat/member/${member.id}`}>
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
                renderUnknownResult={({
                    query,
                    domain,
                }: {
                    query: string
                    domain: string
                }) => (
                    <SearchButton
                        as={Link}
                        href={`/chat/member/${query}@${domain}`}>
                        <Icon icon={SocialPeopleIcon} />
                        <Text weight="medium">
                            {t('feature.chat.send-a-message-to', {
                                name: query,
                            })}
                        </Text>
                    </SearchButton>
                )}
            />
        )
    }

    return <>{content}</>
}
