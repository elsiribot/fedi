/* eslint-disable no-console */
import fs from 'fs'
import path from 'path'

import { i18nLanguages } from '../localization'
import {
    flattenObject,
    getLangJson,
    LanguageJson,
    localizationPath,
} from './i18n-utils'

const modes = ['default', 'missing', 'full']

async function run() {
    const lang = process.argv[2]
    const mode = process.argv[3] ?? 'default'
    const includeEnglish = process.argv[4] ?? 'false'

    if (!Object.keys(i18nLanguages).includes(lang)) {
        console.error(
            `Error: Language must be one of (${Object.keys(i18nLanguages).join(
                '/',
            )}), got ${lang}`,
        )
        return
    }

    if (!modes.includes(mode)) {
        console.error(
            `Error: Mode must be one of (${modes.join('/')}), got ${mode}`,
        )
        return
    }

    const shouldIncludeEnglish =
        includeEnglish === 'true' || includeEnglish === 'yes'

    const langJson = getLangJson(lang)
    const enJson = getLangJson('en')

    const keys = ['Key']

    if (shouldIncludeEnglish) keys.push('Original (en)')

    keys.push(`Translation (${lang})`)

    // Convert JSON to CSV
    let csv = keys.join(',')
    const targetTranslation = flattenObject(langJson)
    const englishTranslation = flattenObject(enJson)

    let languageJson: LanguageJson = {}

    // Only export keys from the target translation that are not present in English
    if (mode === 'missing') {
        for (const [key] of Object.entries(englishTranslation)) {
            if (!targetTranslation[key]) {
                languageJson[key] = ''
            }
        }
    }
    // Export all keys including keys not present in the target translation (set to an empty string)
    else if (mode === 'full') {
        for (const [key] of Object.entries(englishTranslation)) {
            languageJson[key] = targetTranslation[key] ?? ''
        }
    } else {
        languageJson = targetTranslation
    }

    Object.entries(languageJson).forEach(([key, value]) => {
        if (typeof value !== 'string') return

        const row = [key]
        const escapeValue = (v: string) =>
            `"${v.replace(/"/g, '""').replace(/\n/g, '\\n')}"`

        if (shouldIncludeEnglish)
            row.push(
                escapeValue(
                    englishTranslation[
                        key as keyof typeof englishTranslation
                    ] as string,
                ),
            )

        row.push(value ? escapeValue(value) : '')

        csv += `\r\n${row.join(',')}`
    })

    // Write the CSV to the en folder
    const csvPath = path.join(localizationPath, 'export.csv')
    fs.writeFileSync(csvPath, csv, 'utf8')
    console.info('Success! Wrote CSV to', csvPath)
}

run()
