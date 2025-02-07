import { Button } from '@rneui/themed'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from 'react-native'

import { makeLog } from '@fedi/common/utils/log'

import { fedimint } from '../../../bridge'

const log = makeLog('RevealSeed')

export const RevealSeed: React.FC = () => {
    const { t } = useTranslation()
    const [isLoadingSeed, setIsLoadingSeed] = useState(false)

    const handleShowSeed = useCallback(async () => {
        setIsLoadingSeed(true)
        // if bridge failed to initialize and we can't get the seed, alert the user
        try {
            const recoveryWords = await fedimint.getMnemonic()
            Alert.alert('', recoveryWords.join(' '), [
                {
                    text: t('words.okay'),
                },
            ])
        } catch (error) {
            log.error('Failed to reveal seed', error)
            Alert.alert('', t('errors.failed-to-reveal-seed'))
        } finally {
            setIsLoadingSeed(false)
        }
    }, [t])

    const handleRevealSeed = async () => {
        Alert.alert(
            t('phrases.reveal-seed'),
            t('feature.recovery.reveal-seed-guidance'),
            [
                {
                    text: t('words.cancel'),
                },
                {
                    text: t('words.continue'),
                    onPress: handleShowSeed,
                },
            ],
        )
    }

    return (
        <Button
            fullWidth
            onPress={handleRevealSeed}
            title={t('phrases.reveal-seed')}
            loading={isLoadingSeed}
        />
    )
}
