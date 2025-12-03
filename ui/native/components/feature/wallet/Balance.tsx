import { Text } from '@rneui/themed'
import React from 'react'
import { StyleSheet } from 'react-native'

import { useBalance } from '@fedi/common/hooks/amount'
import { useRecoveryProgress } from '@fedi/common/hooks/recovery'
import { selectIsFederationRecovering } from '@fedi/common/redux'
import { Federation } from '@fedi/common/types'

import { useAppSelector } from '../../../state/hooks'
import { Column, Row } from '../../ui/Flex'
import HoloProgressCircle from '../../ui/HoloProgressCircle'

type Props = {
    federationId: Federation['id']
}

const Balance: React.FC<Props> = ({ federationId }) => {
    const { formattedBalanceSats, formattedBalanceFiat } =
        useBalance(federationId)
    const recoveryInProgress = useAppSelector(s =>
        selectIsFederationRecovering(s, federationId),
    )
    const { progress } = useRecoveryProgress(federationId)

    if (recoveryInProgress) return <HoloProgressCircle progress={progress} />

    return (
        <Row align="center" gap="lg">
            <Column gap="xxs">
                <Text medium style={style.balanceText}>
                    {formattedBalanceFiat}
                </Text>
                <Text small style={style.balanceText}>
                    {formattedBalanceSats}
                </Text>
            </Column>
        </Row>
    )
}

const style = StyleSheet.create({
    balanceText: {
        textAlign: 'right',
    },
})

export default Balance
