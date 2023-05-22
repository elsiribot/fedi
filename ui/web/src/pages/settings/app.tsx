import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
    changeLanguage,
    changeSelectedFiatCurrency,
    selectCurrency,
    selectLanguage,
} from '@fedi/common/redux'
import { SupportedCurrency } from '@fedi/common/types'

import { ContentBlock } from '../../components/ContentBlock'
import { RadioGroup } from '../../components/RadioGroup'
import { Text } from '../../components/Text'
import { useAppDispatch, useAppSelector } from '../../hooks'
import i18n from '../../localization/i18n'
import { styled } from '../../styles'

function AppSettings() {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const currency = useAppSelector(selectCurrency)
    const language = useAppSelector(selectLanguage)

    const languageOptions = useMemo(
        () => [
            {
                label: 'English',
                value: 'en',
            },
            {
                label: 'Spanish',
                value: 'es',
            },
            {
                label: 'French',
                value: 'fr',
            },
        ],
        [],
    )

    const currencyOptions = useMemo(
        () =>
            Object.entries(SupportedCurrency).map(([label, value]) => ({
                label,
                value,
            })),
        [],
    )

    return (
        <ContentBlock>
            <Title>
                <Text variant="h1">{t('phrases.app-settings-security')}</Text>
            </Title>
            <Settings>
                <Setting>
                    <Text>{t('words.language')}</Text>
                    <RadioGroup
                        options={languageOptions}
                        value={language || i18n.language}
                        onChange={value => {
                            dispatch(changeLanguage({ language: value, i18n }))
                        }}
                    />
                </Setting>
                <Setting>
                    <Text>{t('words.currency')}</Text>
                    <RadioGroup
                        options={currencyOptions}
                        value={currency}
                        onChange={value =>
                            dispatch(changeSelectedFiatCurrency(value))
                        }
                    />
                </Setting>
            </Settings>
        </ContentBlock>
    )
}

const Title = styled('div', {
    marginBottom: 16,
})

const Settings = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
})

const Setting = styled('label', {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
})

export default AppSettings
