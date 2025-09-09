import { styled } from '@stitches/react'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import SwitchLeftIcon from '@fedi/common/assets/svgs/switch-left.svg'
import SwitchRightIcon from '@fedi/common/assets/svgs/switch-right.svg'
import { useSyncCurrencyRatesAndCache } from '@fedi/common/hooks/currency'
import { useIsOnchainDepositSupported } from '@fedi/common/hooks/federation'
import { TransactionListEntry } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'

import { useRouteState } from '../../context/RouteStateContext'
import { fedimint } from '../../lib/bridge'
import { config, theme } from '../../styles'
import { getHashParams } from '../../utils/linking'
import { Dialog } from '.././Dialog'
import { DialogStatus } from '.././DialogStatus'
import { Icon } from '.././Icon'
import { Text } from '.././Text'
import LightningRequest from './LightningRequest'
import LnurlWithdraw from './LnurlWithdraw'
import OnchainRequest from './OnchainRequest'

interface Props {
    open: boolean
    onOpenChange(open: boolean): void
}

export const RequestPaymentDialog: React.FC<Props> = ({
    open,
    onOpenChange,
}) => {
    const router = useRouter()
    const params = getHashParams(router.asPath)
    const lnurlw = useRouteState('/request')
    const federationId = params.id
    const [isCompleted, setIsCompleted] = useState(false)
    const [requestType, setRequestType] = useState<
        'lightning' | 'bitcoin' | 'lnurl'
    >('lightning')
    const [receivedTransaction, setReceivedTransaction] =
        useState<TransactionListEntry | null>(null)

    const isOnchainSupported = useIsOnchainDepositSupported(
        fedimint,
        federationId,
    )

    const { t } = useTranslation()

    const syncCurrencyRatesAndCache = useSyncCurrencyRatesAndCache(fedimint)

    // Reset on close, focus input on desktop open
    useEffect(() => {
        if (!open) {
            setIsCompleted(false)
            setRequestType('lightning')
            setReceivedTransaction(null)
        } else {
            syncCurrencyRatesAndCache()
            if (!window.matchMedia(config.media.sm).matches) {
                requestAnimationFrame(() =>
                    containerRef.current?.querySelector('input')?.focus(),
                )
            }
        }
    }, [open, syncCurrencyRatesAndCache])

    useEffect(() => {
        if (open && lnurlw) setRequestType('lnurl')
    }, [open, lnurlw])

    const containerRef = useRef<HTMLDivElement | null>(null)

    const handleSubmit = () => {
        setIsCompleted(true)
    }

    const onTransactionReceived = (txn: TransactionListEntry) => {
        setReceivedTransaction(txn)
        setTimeout(() => onOpenChange(false), 3000)
    }

    return (
        <Dialog
            title={t('feature.receive.bitcoin-request')}
            open={open}
            mobileDismiss="back"
            onOpenChange={onOpenChange}>
            <Container ref={containerRef}>
                {isOnchainSupported && !isCompleted && (
                    <RequestTypeToggle
                        onClick={() =>
                            setRequestType(
                                requestType === 'lightning'
                                    ? 'bitcoin'
                                    : 'lightning',
                            )
                        }>
                        <Text variant="caption" weight="medium">
                            {t(
                                requestType === 'lightning'
                                    ? 'words.lightning'
                                    : 'words.onchain',
                            )}
                        </Text>
                        <Icon
                            size={20}
                            icon={
                                requestType === 'lightning'
                                    ? SwitchLeftIcon
                                    : SwitchRightIcon
                            }
                        />
                    </RequestTypeToggle>
                )}

                {requestType === 'bitcoin' ? (
                    <OnchainRequest
                        onMempoolTransaction={onTransactionReceived}
                        federationId={federationId}
                    />
                ) : requestType === 'lightning' ? (
                    <LightningRequest
                        onSubmit={handleSubmit}
                        onInvoicePaid={onTransactionReceived}
                        federationId={federationId}
                    />
                ) : (
                    <LnurlWithdraw
                        onSubmit={handleSubmit}
                        onWithdrawPaid={onTransactionReceived}
                        lnurlw={lnurlw}
                    />
                )}

                {receivedTransaction && (
                    <DialogStatus
                        status="success"
                        title={`${t(
                            receivedTransaction.kind === 'onchainDeposit'
                                ? 'feature.receive.pending-transaction'
                                : 'feature.receive.you-received',
                        )}`}
                        description={`${amountUtils.formatSats(
                            amountUtils.msatToSat(receivedTransaction.amount),
                        )} ${t('words.sats')}`}
                    />
                )}
            </Container>
        </Dialog>
    )
}

const Container = styled('div', {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    paddingTop: 24,
    gap: 24,
    minHeight: 0,
})

const RequestTypeToggle = styled('button', {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    color: theme.colors.grey,
    outline: 'none',

    '&:hover, &:focus': {
        color: theme.colors.primary,
    },
})

export const NoteInput = styled('input', {
    width: '100%',
    padding: 8,
    textAlign: 'center',
    fontSize: theme.fontSizes.caption,
    fontWeight: theme.fontWeights.medium,
    background: 'none',
    border: 'none',
    outline: 'none',

    '&[readonly]': {
        cursor: 'default',
    },
})

export const QRContainer = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    gap: 16,
})
