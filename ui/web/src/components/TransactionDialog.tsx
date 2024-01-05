import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import BitcoinIcon from '@fedi/common/assets/svgs/bitcoin.svg'
import EditIcon from '@fedi/common/assets/svgs/edit.svg'
import PlusIcon from '@fedi/common/assets/svgs/plus.svg'
import { selectActiveFederationId } from '@fedi/common/redux'
import { updateTransactionNotes } from '@fedi/common/redux/transactions'
import { MSats, Transaction, TransactionDirection } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'
import dateUtils from '@fedi/common/utils/DateUtils'

import { useAppDispatch, useAppSelector, useToast } from '../hooks'
import { fedimint } from '../lib/bridge'
import { styled, theme } from '../styles'
import { Dialog } from './Dialog'
import { Icon } from './Icon'
import { Text } from './Text'

interface Props {
    open: boolean
    transaction?: Transaction
    onOpenChange(open: boolean): void
}

export const TransactionDialog: React.FC<Props> = ({
    open,
    transaction: txn,
    onOpenChange,
}) => {
    const dispatch = useAppDispatch()
    const { t } = useTranslation()
    const toast = useToast()
    const federationId = useAppSelector(selectActiveFederationId)

    const isSent = txn?.direction === TransactionDirection.send
    const fee = txn?.lightning?.fee || (0 as MSats)

    const handleAddNote = useCallback(async () => {
        if (!txn || !federationId) return
        const notes = prompt(t('phrases.add-note')) || ''
        try {
            dispatch(
                updateTransactionNotes({
                    fedimint,
                    federationId,
                    transactionId: txn.id,
                    notes,
                }),
            )
        } catch (err) {
            toast.showErrorToast(err, 'error.unknown-error')
        }
    }, [txn, federationId, t, dispatch, toast])

    return (
        <Dialog size="sm" open={open && !!txn} onOpenChange={onOpenChange}>
            {txn && (
                <Container>
                    <IconWrap>
                        <Icon size="md" icon={BitcoinIcon} />
                    </IconWrap>
                    <Text variant="h2">
                        {t(
                            isSent
                                ? 'feature.send.you-sent'
                                : 'feature.receive.you-received',
                        )}{' '}
                        {`${amountUtils.formatSats(
                            amountUtils.msatToSat(txn.amount),
                        )}`}{' '}
                        {t('words.sats').toUpperCase()}
                    </Text>
                    <Details>
                        <Detail>
                            <div>{t('words.time')}</div>
                            <div>
                                {dateUtils.formatTimestamp(
                                    txn.createdAt,
                                    'MMM dd, h:mmaaa',
                                )}
                            </div>
                        </Detail>
                        <Detail>
                            <div>{t('words.fee')}</div>
                            <div>
                                {amountUtils.formatSats(
                                    amountUtils.msatToSat(fee),
                                )}{' '}
                                {t('words.sats').toUpperCase()}
                            </div>
                        </Detail>
                        {txn.bitcoin && (
                            <>
                                <Detail>
                                    <div>{t('phrases.bitcoin-address')}</div>
                                    <div>{txn.bitcoin.address}</div>
                                </Detail>
                            </>
                        )}
                        {txn.lightning && (
                            <>
                                <Detail ellipsize>
                                    <div>{t('phrases.lightning-request')}</div>
                                    <div>{txn.lightning.invoice}</div>
                                </Detail>
                            </>
                        )}
                        <Detail>
                            <div>{t('words.notes')}</div>
                            <div>
                                {txn.notes}
                                {txn.notes ? (
                                    <div>
                                        <AddNoteButton onClick={handleAddNote}>
                                            <Icon icon={EditIcon} size={10} />
                                            <span>
                                                {t('phrases.edit-note')}
                                            </span>
                                        </AddNoteButton>
                                    </div>
                                ) : (
                                    <AddNoteButton onClick={handleAddNote}>
                                        <Icon icon={PlusIcon} size={10} />
                                        <span>{t('phrases.add-note')}</span>
                                    </AddNoteButton>
                                )}
                            </div>
                        </Detail>
                    </Details>
                </Container>
            )}
        </Dialog>
    )
}

const Container = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    gap: 16,
})

const IconWrap = styled('div', {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: 36,
    height: 36,
    borderRadius: '100%',
    background: theme.colors.orange,
    color: theme.colors.white,
})

const Details = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    maxWidth: 230,
    gap: 8,
})

const Detail = styled('div', {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    fontSize: theme.fontSizes.small,

    '> div:first-child': {
        textAlign: 'left',
        fontWeight: theme.fontWeights.medium,
    },

    '> div:last-child': {
        flex: 1,
        minWidth: 0,
        textAlign: 'right',
    },

    variants: {
        ellipsize: {
            true: {
                '> div:last-child': {
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                },
            },
        },
    },
})

const AddNoteButton = styled('button', {
    display: 'flex',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 2,
    color: theme.colors.darkGrey,
    opacity: 0.5,

    '&:hover, &:focus': {
        opacity: 1,
    },
})
