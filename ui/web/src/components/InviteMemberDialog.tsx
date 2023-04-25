import React from 'react'
import { useTranslation } from 'react-i18next'

import { selectActiveFederation } from '@fedi/common/redux'

import { useAppSelector } from '../hooks'
import { styled, theme } from '../styles'
import { CopyInput } from './CopyInput'
import { Dialog } from './Dialog'
import { QRCode } from './QRCode'
import { Text } from './Text'

interface Props {
    open: boolean
    onOpenChange(open: boolean): void
}

export const InviteMemberDialog: React.FC<Props> = props => {
    const { t } = useTranslation()
    const connectInfo = useAppSelector(selectActiveFederation)?.connectInfo

    if (!connectInfo) return null

    return (
        <Dialog title={t('feature.federations.federation-invite')} {...props}>
            <Content>
                <QRCode data={connectInfo} />
                <CopyInput
                    value={connectInfo}
                    onCopyMessage={t(
                        'feature.federations.copied-group-invite-code',
                    )}
                />
                <Notice>
                    <Text variant="caption">
                        {t('feature.federations.invite-link-notice')}
                    </Text>
                </Notice>
            </Content>
        </Dialog>
    )
}

const Content = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    paddingTop: 16,
    gap: 16,
})

const Notice = styled('div', {
    textAlign: 'center',
    color: theme.colors.grey,
})
