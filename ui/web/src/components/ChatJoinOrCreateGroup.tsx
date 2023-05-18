import { useRouter } from 'next/router'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
    createChatGroup,
    fetchChatMembers,
    joinChatGroup,
    selectActiveFederation,
    selectChatXmppClient,
} from '@fedi/common/redux'
import {
    decodeGroupInvitationLink,
    encodeGroupInvitationLink,
} from '@fedi/common/utils/xmpp'

import { useAppDispatch, useAppSelector, useToast } from '../hooks'
import { styled, theme } from '../styles'
import { Avatar } from './Avatar'
import { Button } from './Button'
import { CopyInput } from './CopyInput'
import { Input } from './Input'
import { QRScanner } from './QRScanner'

export const ChatJoinOrCreateGroup: React.FC = () => {
    const { t } = useTranslation()
    const { push } = useRouter()
    const dispatch = useAppDispatch()
    const toast = useToast()
    const federationId = useAppSelector(selectActiveFederation)?.id
    const xmppClient = useAppSelector(selectChatXmppClient)
    const [joinGroupLink, setJoinGroupLink] = useState('')
    const [isCreatingGroup, setIsCreatingGroup] = useState(false)
    const [isScanning, setIsScanning] = useState(false)
    const [newGroupLink, setNewGroupLink] = useState('')
    const [newGroupName, setNewGroupName] = useState(
        t('feature.chat.new-group'),
    )
    const [isSavingGroup, setIsSavingGroup] = useState(false)

    useEffect(() => {
        if (!federationId) return
        dispatch(fetchChatMembers({ federationId }))
    }, [dispatch, federationId])

    // Generate a new group when we go to create one
    useEffect(() => {
        if (!isCreatingGroup || !xmppClient || newGroupLink) return
        xmppClient.generateUniqueGroupId().then(id => {
            setNewGroupLink(encodeGroupInvitationLink(id))
        })
    }, [dispatch, isCreatingGroup, xmppClient, newGroupLink])

    const handleJoinGroup = useCallback(async () => {
        if (!federationId) return
        try {
            const res = await dispatch(
                joinChatGroup({ federationId, link: joinGroupLink }),
            ).unwrap()
            push(`/chat/group/${res.id}`)
        } catch (err) {
            toast.showErrorToast(err, 'errors.chat-unavailable')
        }
    }, [dispatch, toast, federationId, joinGroupLink, push])

    const handleSaveNewGroup = useCallback(async () => {
        setIsSavingGroup(true)
        try {
            if (!federationId) throw new Error('errors.chat-unavailable')
            const id = decodeGroupInvitationLink(newGroupLink)
            const newGroup = await dispatch(
                createChatGroup({ federationId, id, name: newGroupName }),
            ).unwrap()
            push(`/chat/group/${newGroup.id}`)
        } catch (err) {
            toast.showErrorToast(err, 'errors.chat-unavailable')
        }
        setIsSavingGroup(false)
    }, [federationId, newGroupLink, newGroupName, dispatch, push, toast])

    // Automatically attempt to join group after changing value
    useEffect(() => {
        if (!joinGroupLink) return
        const timeout = setTimeout(() => {
            handleJoinGroup()
        }, 500)
        return () => clearTimeout(timeout)
    }, [joinGroupLink, handleJoinGroup])

    let content: React.ReactNode
    if (isCreatingGroup) {
        content = (
            <Inner>
                <Avatar size="lg" name={newGroupName} />
                <Input
                    label={t('feature.chat.group-name')}
                    value={newGroupName}
                    onChange={ev => setNewGroupName(ev.currentTarget.value)}
                />
                <CopyInput
                    label={t('feature.chat.group-invite')}
                    value={newGroupLink}
                    onCopyMessage={t('feature.chat.copied-group-invite-code')}
                />
                <Buttons>
                    <Button
                        width="full"
                        disabled={!newGroupLink}
                        loading={isSavingGroup}
                        onClick={handleSaveNewGroup}>
                        {t('feature.chat.view-group')}
                    </Button>
                </Buttons>
            </Inner>
        )
    } else {
        content = (
            <Inner>
                {isScanning ? (
                    <ScanWrap>
                        <QRScanner onScan={res => setJoinGroupLink(res.data)} />
                    </ScanWrap>
                ) : (
                    <Input
                        label={t('feature.chat.paste-group-invite')}
                        placeholder="fedi:group..."
                        value={joinGroupLink}
                        onChange={ev =>
                            setJoinGroupLink(ev.currentTarget.value)
                        }
                        autoFocus
                    />
                )}
                <Buttons>
                    {isScanning ? (
                        <Button
                            width="full"
                            onClick={() => setIsScanning(false)}>
                            {t('feature.chat.paste-group-invite')}
                        </Button>
                    ) : (
                        <Button
                            width="full"
                            onClick={() => setIsScanning(true)}>
                            {t('feature.chat.scan-group-invite')}
                        </Button>
                    )}
                    <Button
                        width="full"
                        onClick={() => setIsCreatingGroup(true)}>
                        {t('feature.chat.create-a-group')}
                    </Button>
                </Buttons>
            </Inner>
        )
    }

    return <Container>{content}</Container>
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

const ScanWrap = styled('div', {
    maxWidth: 280,
})

const Buttons = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    gap: 8,
})
