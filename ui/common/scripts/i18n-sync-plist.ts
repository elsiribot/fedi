/* eslint-disable no-console */
import fs from 'fs'
import path from 'path'

import { i18nLanguages } from '../localization'

interface Translations {
    purposeStrings?: {
        [key: string]: string
    }
}

interface StringUnit {
    state: string
    value: string
}

interface Localization {
    stringUnit: StringUnit
}

interface StringCatalogEntry {
    extractionState: string
    localizations: {
        [locale: string]: Localization
    }
}

interface StringCatalog {
    sourceLanguage: string
    strings: {
        [key: string]: StringCatalogEntry
    }
    version: string
}

interface LanguageMapping {
    [langCode: string]: string | string[]
}

function generateStringCatalog(localizationsPath?: string): void {
    console.log('🔍 Starting string catalog generation...')

    const languages: string[] = Object.keys(i18nLanguages)
    console.log(
        `🌐 Found ${languages.length} languages: ${languages.join(', ')}`,
    )

    const baseLocalizationsPath =
        localizationsPath || path.join(__dirname, '../localization')
    console.log(
        `📂 Looking for localization files in: ${baseLocalizationsPath}`,
    )

    if (!fs.existsSync(baseLocalizationsPath)) {
        console.error(
            `❌ ERROR: Localizations directory does not exist: ${baseLocalizationsPath}`,
        )
        console.log('📋 Debug: Current directory is', process.cwd())
        console.log('📋 Debug: __dirname is', __dirname)
        return
    }
    const languageMapping: LanguageMapping = {
        pt: ['pt-BR'], // Map pt to pt-BR.lproj only for now. Change this when we have EU Portuguese
        es: ['es-419'],
        ara: ['ar-SS'],
        tl: ['fil'],
    }
    console.log('📝 Language mapping:', languageMapping)
    const stringCatalog: StringCatalog = {
        sourceLanguage: 'en',
        strings: {},
        version: '1.0',
    }
    // Purpose string keys found across all languages
    const allPurposeStringKeys: Set<string> = new Set()

    // First pass: collect all purpose string keys and translations
    console.log(
        '🔍 First pass: collecting purpose string keys and translations...',
    )
    const purposeStringsByLang: Record<string, Record<string, string>> = {}

    for (const lang of languages) {
        try {
            const langDir = path.join(baseLocalizationsPath, lang)
            const translationFilePath: string = path.join(
                langDir,
                'common.json',
            )
            console.log(
                `🔍 Looking for translation file: ${translationFilePath}`,
            )

            if (!fs.existsSync(translationFilePath)) {
                console.warn(
                    `⚠️ Warning: Translation file not found: ${translationFilePath}`,
                )
                continue
            }

            console.log(`✅ Found translation file for ${lang}`)
            const translationsRaw: string = fs.readFileSync(
                translationFilePath,
                'utf8',
            )
            const translations: Translations = JSON.parse(translationsRaw)
            console.log(`✅ Successfully parsed JSON for ${lang}`)

            // Get purpose strings
            const purposeStrings = translations.purposeStrings || {}
            const purposeKeysCount = Object.keys(purposeStrings).length

            console.log(
                `📊 Found ${purposeKeysCount} purpose strings for ${lang}`,
            )

            if (purposeKeysCount === 0) {
                console.warn(
                    `⚠️ Warning: No purpose strings found in ${lang}/common.json. Make sure 'purposeStrings' property exists and is not empty.`,
                )
                console.log(
                    `📋 Debug: Available top-level keys: ${Object.keys(translations).join(', ')}`,
                )
                continue
            }

            // Store purpose strings for this language
            purposeStringsByLang[lang] = {}

            // Add keys to global set and store translations
            for (const [key, value] of Object.entries(purposeStrings)) {
                if (value) {
                    allPurposeStringKeys.add(key)
                    purposeStringsByLang[lang][key] = value
                }
            }
        } catch (error) {
            console.error(`❌ ERROR processing ${lang}:`, error)
            if (error instanceof Error) {
                console.error(`   ${error.message}`)
            }
        }
    }

    console.log(
        `📊 Total unique purpose string keys found: ${allPurposeStringKeys.size}`,
    )

    // Second pass: build the string catalog structure
    console.log('🔍 Second pass: building string catalog structure...')

    for (const key of Array.from(allPurposeStringKeys)) {
        // Initialize entry for this purpose string
        const entry: StringCatalogEntry = {
            extractionState: 'migrated',
            localizations: {},
        }

        // Add translations for each language
        for (const lang of languages) {
            if (
                !purposeStringsByLang[lang] ||
                !purposeStringsByLang[lang][key]
            ) {
                continue // Skip if language doesn't have this purpose string
            }

            const value = purposeStringsByLang[lang][key]

            // Get the mapped locale identifier(s) for this language
            if (languageMapping[lang]) {
                const mappedLocales = Array.isArray(languageMapping[lang])
                    ? (languageMapping[lang] as string[])
                    : [languageMapping[lang] as string]

                // Add translation for each mapped locale
                for (const localeId of mappedLocales) {
                    entry.localizations[localeId] = {
                        stringUnit: {
                            state: 'translated',
                            value: value,
                        },
                    }
                }
            } else {
                // Use language code directly as locale identifier if no special mapping
                entry.localizations[lang] = {
                    stringUnit: {
                        state: 'translated',
                        value: value,
                    },
                }
            }
        }

        // Add entry to string catalog
        stringCatalog.strings[key] = entry
    }

    // Create directory if needed
    const outputPath = path.join(
        __dirname,
        `../../native/ios`,
        'InfoPlist.xcstrings',
    )

    // Write string catalog to file
    console.log(`📄 Writing string catalog to: ${outputPath}`)

    try {
        fs.writeFileSync(outputPath, JSON.stringify(stringCatalog, null, 2))
        console.log(`✅ Successfully generated string catalog at ${outputPath}`)
        console.log(
            `📊 The catalog contains ${Object.keys(stringCatalog.strings).length} strings with ${Object.keys(i18nLanguages).length} localizations`,
        )
        console.warn(
            `⚠️⚠️⚠️ WARNING: If you ran this script, and we don't have a EU Portuguese localisation in the Fedi app, then you have probably erased the EU Portuguese purpose strings. Open Xcode and add them manually from the diff or revert your changes and fix this script`,
        )
    } catch (error) {
        console.error(`❌ ERROR writing string catalog:`, error)
        if (error instanceof Error) {
            console.error(`   ${error.message}`)
        }
    }
}

generateStringCatalog()
