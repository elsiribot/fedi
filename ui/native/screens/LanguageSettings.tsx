import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'

import Radio from '../components/ui/Radio'

const LanguageSettings: React.FC<{}> = () => {
    const { theme } = useTheme()
    const { i18n } = useTranslation()
    const insets = useSafeAreaInsets()

    const style = styles(theme, insets)

    const languages = {
        en: 'English',
        es: 'Español',
        fr: 'Français',
        id: 'Bahasa Indonesia',
    }

    return (
        <ScrollView
            style={style.scrollContainer}
            contentContainerStyle={style.contentContainer}
            overScrollMode="auto">
            <View style={style.container}>
                {Object.entries(languages).map(([language, display]) => (
                    <Radio
                        title={<Text style={style.radioText}>{display}</Text>}
                        checked={i18n.language === language}
                        onPress={() => i18n.changeLanguage(language)}
                        containerStyle={style.radioContainer}
                    />
                ))}
            </View>
        </ScrollView>
    )
}

const styles = (theme: Theme, insets: EdgeInsets) =>
    StyleSheet.create({
        scrollContainer: {
            flex: 1,
        },
        contentContainer: {
            flexGrow: 1,
            paddingTop: theme.spacing.lg,
            paddingLeft: insets.left + theme.spacing.lg,
            paddingRight: insets.right + theme.spacing.lg,
            paddingBottom: Math.max(insets.bottom, theme.spacing.lg),
            gap: theme.spacing.md,
        },
        container: {
            flex: 1,
            flexDirection: 'column',
        },
        radioContainer: {
            margin: 0,
            paddingHorizontal: 0,
        },
        radioText: {
            paddingHorizontal: theme.spacing.md,
            textAlign: 'left',
        },
    })

export default LanguageSettings
