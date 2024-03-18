import React, { useState } from 'react'

import { ChatCreateGroup } from './ChatCreateGroup'
import { ChatMemberSearch } from './ChatMemberSearch'

export const ChatNew: React.FC = () => {
    const [isCreatingGroup, setIsCreatingGroup] = useState(false)

    let content: React.ReactNode
    if (isCreatingGroup) {
        content = <ChatCreateGroup />
    } else {
        content = (
            <ChatMemberSearch
                createNewGroup={() => setIsCreatingGroup(true)}
            />
        )
    }

    return <>{content}</>
}
