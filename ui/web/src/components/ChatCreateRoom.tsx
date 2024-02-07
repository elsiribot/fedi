import { useRouter } from 'next/router'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { createMatrixRoom } from '@fedi/common/redux'

import { useAppDispatch, useToast } from '../hooks'
import { styled } from '../styles'
import { Button } from './Button'
import { Input } from './Input'
import { Switch } from './Switch'
import { Text } from './Text'

export const ChatCreateRoom: React.FC = () => {
    const { t } = useTranslation()
    const { push } = useRouter()
    const dispatch = useAppDispatch()
    const { showErrorToast } = useToast()
    const [newGroupName, setNewGroupName] = useState(
        t('feature.chat.new-group'),
    )
    const [isSavingGroup, setIsSavingGroup] = useState(false)
    const [isBroadcastOnly, setIsBroadcastOnly] = useState(false)

    const handleCreateRoom = useCallback(async () => {
        setIsSavingGroup(true)
        try {
            const { roomId } = await dispatch(
                createMatrixRoom({
                    name: newGroupName,
                    broadcastOnly: isBroadcastOnly,
                }),
            ).unwrap()
            push(`/chat/room/${roomId}`)
        } catch (err) {
            showErrorToast(err, 'errors.chat-unavailable')
        }
        setIsSavingGroup(false)
    }, [newGroupName, dispatch, push, showErrorToast, isBroadcastOnly])

    return (
        <Container>
            <Inner>
                <Input
                    label={t('feature.chat.group-name')}
                    value={newGroupName}
                    onChange={ev => setNewGroupName(ev.currentTarget.value)}
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
                        loading={isSavingGroup}
                        onClick={handleCreateRoom}>
                        {t('feature.chat.create-group')}
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
