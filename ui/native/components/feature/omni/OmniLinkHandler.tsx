import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking } from 'react-native'

import { useUpdatingRef } from '@fedi/common/hooks/util'
import { parseUserInput } from '@fedi/common/utils/parser'

import { fedimint } from '../../../bridge'
import { AnyParsedData, ParserDataType } from '../../../types'
import { OmniConfirmation } from './OmniConfirmation'

export const OmniLinkHandler: React.FC = () => {
    const { t } = useTranslation()
    const [parsedLink, setParsedLink] = useState<AnyParsedData | null>(null)
    const tRef = useUpdatingRef(t)

    // Grab the initial link the app was opened with, if any.
    // Subscribe to future links that bring the app to the foreground.
    useEffect(() => {
        const parseUrl = async (url: string | null) => {
            if (!url) return
            try {
                const parsed = await parseUserInput(url, fedimint, tRef.current)
                setParsedLink(parsed)
            } catch (err) {
                console.warn('OmniLinkHandler: failed to parse url', err)
                setParsedLink({ type: ParserDataType.Unknown, data: {} })
            }
        }

        Linking.getInitialURL().then(url => parseUrl(url))
        Linking.addEventListener('url', event => parseUrl(event.url))
    }, [tRef])

    if (!parsedLink) return null

    return (
        <OmniConfirmation
            parsedData={parsedLink}
            goBackText={t('words.cancel')}
            onGoBack={() => setParsedLink(null)}
            onSuccess={() => setParsedLink(null)}
        />
    )
}
