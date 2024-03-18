import { useRouter } from 'next/router'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useToast } from '@fedi/common/hooks/toast'
import {
    createChatGroup,
    fetchChatMembers,
    selectActiveFederationId,
    selectChatXmppClient,
} from '@fedi/common/redux'
import { ChatType } from '@fedi/common/types'
import { encodeGroupInvitationLink } from '@fedi/common/utils/xmpp'

import { useAppDispatch, useAppSelector } from '../hooks'
import { styled } from '../styles'
import { Button } from './Button'
import { ChatAvatar } from './ChatAvatar'
import { CopyInput } from './CopyInput'
import { Input } from './Input'
import { Switch } from './Switch'
import { Text } from './Text'

export const ChatCreateGroup: React.FC = () => {
    const { t } = useTranslation()
    const { push } = useRouter()
    const dispatch = useAppDispatch()
    const toast = useToast()
    const federationId = useAppSelector(selectActiveFederationId)
    const xmppClient = useAppSelector(selectChatXmppClient)
    const [newGroupId, setNewGroupId] = useState<string>('')
    const [newGroupName, setNewGroupName] = useState(
        t('feature.chat.new-group'),
    )
    const [isSavingGroup, setIsSavingGroup] = useState(false)
    const [isBroadcastOnly, setIsBroadcastOnly] = useState(false)

    useEffect(() => {
        if (!federationId) return
        dispatch(fetchChatMembers({ federationId }))
    }, [dispatch, federationId])

    // Generate a new group when we go to create one
    useEffect(() => {
        if (!xmppClient || newGroupId) return
        xmppClient.generateUniqueGroupId().then(id => {
            setNewGroupId(id)
        })
    }, [dispatch, xmppClient, newGroupId])

    const handleSaveNewGroup = useCallback(async () => {
        setIsSavingGroup(true)
        try {
            if (!federationId) throw new Error('errors.chat-unavailable')
            const newGroup = await dispatch(
                createChatGroup({
                    federationId,
                    id: newGroupId,
                    name: newGroupName,
                    broadcastOnly: isBroadcastOnly,
                }),
            ).unwrap()
            push(`/chat/group/${newGroup.id}`)
        } catch (err) {
            toast.error(t, err, 'errors.chat-unavailable')
        }
        setIsSavingGroup(false)
    }, [
        federationId,
        newGroupId,
        newGroupName,
        dispatch,
        push,
        toast,
        isBroadcastOnly,
        t,
    ])

    // The chat doesn't actually exist yet, so we need to create a fake one
    const chat = useMemo(() => {
        return {
            id: newGroupId,
            name: newGroupName,
            type: ChatType.group,
            broadcastOnly: isBroadcastOnly,
        }
    }, [newGroupId, newGroupName, isBroadcastOnly])

    return (
        <Container>
            <Inner>
                <ChatAvatar
                    size="lg"
                    chat={chat}
                    css={{ opacity: chat.id ? 1 : 0 }}
                />
                <Input
                    label={t('feature.chat.group-name')}
                    value={newGroupName}
                    onChange={ev => setNewGroupName(ev.currentTarget.value)}
                />
                <CopyInput
                    label={t('feature.chat.group-invite')}
                    value={
                        newGroupId ? encodeGroupInvitationLink(newGroupId) : ''
                    }
                    onCopyMessage={t('feature.chat.copied-group-invite-code')}
                />
                <BroadcastSwitchContainer>
                    <Text>{t('feature.chat.broadcast-only')}</Text>
                    <Switch
                        checked={isBroadcastOnly}
                        onCheckedChange={setIsBroadcastOnly}
                    />
                </BroadcastSwitchContainer>
                <Buttons>
                    <Button
                        width="full"
                        disabled={!newGroupId}
                        loading={isSavingGroup}
                        onClick={handleSaveNewGroup}>
                        {t('feature.chat.view-group')}
                    </Button>
                </Buttons>
            </Inner>
        </Container>
    )
}

const Container = styled('div', {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: 24,
})

const Inner = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    gap: 16,
})

const Buttons = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    gap: 8,
})

const BroadcastSwitchContainer = styled('div', {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
})
