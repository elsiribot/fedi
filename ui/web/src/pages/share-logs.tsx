import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import { isValidSupportTicketNumber } from '@fedi/common/utils/validation'

import { Button } from '../components/Button'
import { ContentBlock } from '../components/ContentBlock'
import * as Layout from '../components/Layout'
import ShareLogs from '../components/ShareLogs'
import { Text } from '../components/Text'
import { useShareLogs } from '../hooks/export'
import { styled, theme } from '../styles'

// Number of times the bug icon needs
// to be clicked to attach db logs
const BUG_CLICK_THRESHOLD = 21

export default function ShareLogsPage() {
    const { t } = useTranslation()
    const { status, collectAttachmentsAndSubmit } = useShareLogs()

    const [ticketNumber, setTicketNumber] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isValid, setIsValid] = useState<boolean>(false)
    const [bugClicks, setBugClicks] = useState<number>(0)
    const [sendDb, setSendDb] = useState<boolean>(false)

    useEffect(() => {
        if (ticketNumber.trim().length === 0) {
            setIsValid(false)
            setError(null)
            return
        }

        const valid = isValidSupportTicketNumber(ticketNumber)

        setIsValid(valid)
        setError(valid ? null : t('feature.support.invalid-ticket-number'))
    }, [ticketNumber, t])

    useEffect(() => {
        if (status === 'error') {
            setError('Logs could not be submitted')
            return
        }

        if (status === 'success') {
            setError(null)
            setTicketNumber('')
        }
    }, [status])

    const handleOnSubmit = async () => {
        if (!isValid) return

        await collectAttachmentsAndSubmit(sendDb, ticketNumber)
    }

    const handleOnBugClick = async () => {
        const newBugClicks = bugClicks + 1
        setBugClicks(newBugClicks)

        if (newBugClicks > BUG_CLICK_THRESHOLD) {
            setSendDb(true)
        }
    }

    return (
        <ContentBlock>
            <Layout.Root>
                <Layout.Header back="/settings">
                    <Layout.Title subheader>
                        {t('feature.developer.share-logs')}
                    </Layout.Title>
                </Layout.Header>

                <Layout.Content>
                    <ShareLogs
                        ticketNumber={ticketNumber}
                        onChange={setTicketNumber}
                        error={error}
                    />
                </Layout.Content>

                <Layout.Actions>
                    <Disclaimer
                        variant="caption"
                        css={{
                            color: theme.colors.darkGrey,
                        }}>
                        <BugIcon onClick={handleOnBugClick}>🪲</BugIcon>
                        <Trans
                            i18nKey="feature.support.log-disclaimer"
                            components={{
                                anchor: (
                                    <a
                                        target="_blank"
                                        href={'https://support.fedi.xyz'} // temporary until chat widget is used
                                    />
                                ),
                            }}
                        />
                    </Disclaimer>

                    <Button
                        width="full"
                        loading={status === 'loading'}
                        onClick={() => handleOnSubmit()}
                        disabled={status === 'loading'}>
                        {t('words.submit')}
                    </Button>
                </Layout.Actions>
            </Layout.Root>
        </ContentBlock>
    )
}

const BugIcon = styled('div', {
    cursor: 'default',
    fontSize: 24,
    userSelect: 'none',
})

const Disclaimer = styled(Text, {
    '& a': {
        textDecoration: 'underline',
    },
})
