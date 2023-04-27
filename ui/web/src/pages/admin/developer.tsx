import React, { useCallback, useEffect, useMemo, useState } from 'react'

import {
    changeAuthenticatedGuardian,
    selectActiveFederation,
    selectAuthenticatedMember,
} from '@fedi/common/redux'
import { LightningGateway } from '@fedi/common/types'

import { Button } from '../../components/Button'
import { ContentBlock } from '../../components/ContentBlock'
import { Input } from '../../components/Input'
import { RadioGroup } from '../../components/RadioGroup'
import { Text } from '../../components/Text'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { fedimint } from '../../lib/bridge'
import { styled } from '../../styles'

function DeveloperPage() {
    const dispatch = useAppDispatch()
    const activeFederation = useAppSelector(selectActiveFederation)
    const authenticatedGuardian = useAppSelector(
        s => s.federation.authenticatedGuardian,
    )
    const [gateways, setGateways] = useState<LightningGateway[]>([])
    const [guardianPassword, setGuardianPassword] = useState('')

    const federationId = activeFederation?.id
    const federationNodes = activeFederation?.nodes

    /* Lightning gateways */

    useEffect(() => {
        if (!federationId) return
        fedimint.listGateways(federationId).then(setGateways)
    }, [federationId])

    const gatewayOptions = useMemo(
        () =>
            gateways.map(gateway => ({
                label: gateway.api,
                value: gateway.nodePubKey,
            })),
        [gateways],
    )

    const activeGatewayPubKey = gateways.find(g => g.active)?.nodePubKey

    const handleSelectGateway = useCallback(
        (nodePubKey: string) => {
            if (!federationId) return
            fedimint.switchGateway(nodePubKey, federationId)
            setGateways(gs =>
                gs.map(g => ({ ...g, active: g.nodePubKey === nodePubKey })),
            )
        },
        [federationId],
    )

    /* Authenticated guardian */

    const guardians = useMemo(() => {
        if (!federationNodes) return []
        return federationNodes.map((node, idx) => ({
            ...node,
            peerId: idx,
            password: `${idx + 1}${idx + 1}${idx + 1}${idx + 1}`,
        }))
    }, [federationNodes])

    const guardianOptions = useMemo(
        () => [
            { label: 'None', value: '' },
            ...guardians.map(g => ({ label: g.name, value: g.url })),
        ],
        [guardians],
    )

    const handleSelectGuardian = useCallback(
        (guardianUrl: string) => {
            const guardian = guardians.find(g => g.url === guardianUrl) || null
            dispatch(changeAuthenticatedGuardian(guardian))
        },
        [dispatch, guardians],
    )

    const handleSaveGuardianPassword = useCallback(() => {
        if (!authenticatedGuardian) return
        dispatch(
            changeAuthenticatedGuardian({
                ...authenticatedGuardian,
                password: guardianPassword,
            }),
        )
    }, [dispatch, authenticatedGuardian, guardianPassword])

    useEffect(() => {
        setGuardianPassword(authenticatedGuardian?.password || '')
    }, [authenticatedGuardian])

    return (
        <ContentBlock>
            <Settings>
                <Text variant="h1">Developer settings</Text>
                <Setting>
                    <Text>Lightning gateway</Text>
                    <RadioGroup
                        options={gatewayOptions}
                        value={activeGatewayPubKey}
                        onChange={handleSelectGateway}
                    />
                </Setting>
                <Setting>
                    <Text>Simulate guardian mode</Text>
                    <RadioGroup
                        options={guardianOptions}
                        value={authenticatedGuardian?.url || ''}
                        onChange={handleSelectGuardian}
                    />
                    {authenticatedGuardian && (
                        <>
                            <Input
                                label="Password"
                                value={guardianPassword}
                                onChange={ev =>
                                    setGuardianPassword(ev.currentTarget.value)
                                }
                            />
                            <Button onClick={handleSaveGuardianPassword}>
                                Save password
                            </Button>
                        </>
                    )}
                </Setting>
            </Settings>
        </ContentBlock>
    )
}

const Settings = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
})

const Setting = styled('label', {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
})

export default DeveloperPage
