import React from 'react'

import BitcoinCircleIcon from '@fedi/common/assets/svgs/bitcoin-circle.svg'
import { Transaction } from '@fedi/common/types'
import { makeTxnStatusIcon } from '@fedi/common/utils/wallet'

import { theme } from '../../styles'
import { HistoryIcon } from '../HistoryList/HistoryIcon'
import { Icon } from '../Icon'

interface Props {
    txn: Transaction
}

export const TransactionIcon: React.FC<Props> = ({ txn }) => {
    const badge = makeTxnStatusIcon(txn)

    return (
        <HistoryIcon badge={badge} color={theme.colors.orange}>
            <Icon icon={BitcoinCircleIcon} size={38} />
        </HistoryIcon>
    )
}
