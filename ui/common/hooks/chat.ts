import { useState, useMemo } from 'react'

import type { ChatMember } from '@fedi/common/types'

export function useChatMemberSearch(members: ChatMember[]) {
    const [query, setQuery] = useState('')

    const searchedMembers = useMemo(() => {
        if (!query) return members
        const lowerQeury = query.toLowerCase()
        const filteredMembers = members.filter(m =>
            m.username.toLowerCase().includes(lowerQeury),
        )
        return filteredMembers.sort((m1, m2) => {
            const m1Name = m1.username.toLowerCase()
            const m2Name = m2.username.toLowerCase()
            if (m1Name === lowerQeury) {
                return 1
            }
            if (m2Name === lowerQeury) {
                return -1
            }
            if (m1Name.startsWith(lowerQeury)) {
                return 1
            }
            if (m2Name.startsWith(lowerQeury)) {
                return -1
            }
            return 0
        })
    }, [members, query])

    const isExactMatch =
        searchedMembers[0]?.username.toLowerCase() === query.toLowerCase()

    return {
        query,
        setQuery,
        searchedMembers,
        isExactMatch,
    }
}
