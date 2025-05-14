import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useMultispendTransactions } from '@fedi/common/hooks/multispend'
import { makeLog } from '@fedi/common/utils/log'

import MultispendFederationGate from '../components/feature/multispend/MultispendFederationGate'
import MultispendTransactionsList from '../components/feature/multispend/MultispendTransactionsList'
import Flex from '../components/ui/Flex'
import { RootStackParamList } from '../types/navigation'

const log = makeLog('MultispendTransactions')

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'MultispendTransactions'
>

const MultispendTransactions: React.FC<Props> = ({ route }) => {
    const { roomId } = route.params
    const { t } = useTranslation()
    const [isLoading, setIsLoading] = useState(false)
    const { transactions, fetchTransactions } = useMultispendTransactions(
        t,
        roomId,
    )

    useEffect(() => {
        setIsLoading(true)
        fetchTransactions()
            .catch(err => {
                log.error('Error refreshing transactions', err)
            })
            .finally(() => setIsLoading(false))
    }, [fetchTransactions, t])

    return (
        <MultispendFederationGate roomId={roomId}>
            <Flex grow>
                <MultispendTransactionsList
                    roomId={roomId}
                    loading={isLoading}
                    transactions={transactions}
                    refreshTransactions={() =>
                        fetchTransactions({ refresh: true })
                    }
                    loadMoreTransactions={() =>
                        fetchTransactions({ more: true })
                    }
                />
            </Flex>
        </MultispendFederationGate>
    )
}

export default MultispendTransactions
