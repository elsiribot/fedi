/* eslint-disable no-console */
import fs from 'fs'
import get from 'lodash/get'
import path from 'path'

type LanguageJson = { [key: string]: string | LanguageJson }

const languages = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    id: 'Indonesian',
    pt: 'Portugese',
}

async function run() {
    const lang = process.argv[2] ?? 'en'

    if (!Object.keys(languages).includes(lang)) {
        console.log(
            `Language must be one of (${Object.keys(languages).join(',')})`,
        )
        return
    }

    // Read in english JSON
    const localizationPath = path.join(__dirname, '..', 'localization')
    const enJson = JSON.parse(
        fs.readFileSync(
            path.join(localizationPath, lang + '/common.json'),
            'utf8',
        ),
    )

    // Convert JSON to CSV
    let csv = `Key,Text (${lang}),Text (Translated)`
    function appendKeysToCsv(json: LanguageJson, root?: string) {
        Object.entries(json).forEach(([key, value]) => {
            const keyPath = root ? `${root}.${key}` : key
            if (typeof value !== 'string') {
                return appendKeysToCsv(value, keyPath)
            }
            if (!get(json, keyPath)) {
                const escaped = `"${value.replace(/"/g, '""')}"`
                csv += `\r\n${keyPath},${escaped},`
            }
        })
    }
    appendKeysToCsv(enJson)

    // Write the CSV to the en folder
    const csvPath = path.join(localizationPath, 'export.csv')
    fs.writeFileSync(csvPath, csv, 'utf8')
    console.info('Success! Wrote CSV to', csvPath)
}

run()
