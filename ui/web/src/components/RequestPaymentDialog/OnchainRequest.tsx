import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useMakeOnchainAddress } from '@fedi/common/hooks/receive'
import { useToast } from '@fedi/common/hooks/toast'
import { TransactionListEntry } from '@fedi/common/types'

import { NoteInput, QRContainer } from '.'
import { fedimint } from '../../lib/bridge'
import { CopyInput } from '../CopyInput'
import { QRCode } from '../QRCode'

export default function OnchainRequest({
    onMempoolTransaction,
    federationId,
}: {
    onMempoolTransaction: (txn: TransactionListEntry) => void
    federationId?: string
}) {
    const toast = useToast()

    const { t } = useTranslation()
    const { address, makeOnchainAddress, onSaveNotes } = useMakeOnchainAddress({
        fedimint,
        federationId,
        onSaveNotesError: e => toast.error(t, e),
        onMempoolTransaction,
    })

    const [notes, setNotes] = useState('')

    useEffect(() => {
        if (address) return

        makeOnchainAddress()
    }, [address, makeOnchainAddress])

    return (
        <QRContainer>
            <QRCode data={address} />
            <NoteInput
                value={notes}
                placeholder={t('phrases.add-note')}
                onChange={e => setNotes(e.currentTarget.value)}
                onBlur={() => onSaveNotes(notes)}
            />
            <CopyInput
                value={address || ''}
                onCopyMessage={t('feature.receive.copied-payment-code')}
            />
        </QRContainer>
    )
}
