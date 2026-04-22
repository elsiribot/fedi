import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import { Trans, useTranslation } from 'react-i18next'
import { Image, Linking, StyleSheet } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'

import { Images } from '../assets/images'
import { Column } from '../components/ui/Flex'
import GradientView from '../components/ui/GradientView'
import { PressableIcon } from '../components/ui/PressableIcon'
import { SafeAreaContainer } from '../components/ui/SafeArea'
import SvgImage from '../components/ui/SvgImage'
import { reset } from '../state/navigation'
import { RootStackParamList } from '../types/navigation'
import { useIsFeatureUnlocked } from '../utils/hooks/security'

export type Props = NativeStackScreenProps<RootStackParamList, 'UpdateApp'>

export default function UpdateApp({ navigation }: Props) {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const insets = useSafeAreaInsets()
    const isAppUnlocked = useIsFeatureUnlocked('app')

    const handleClose = () => {
        if (navigation.canGoBack()) {
            navigation.goBack()
        } else if(isAppUnlocked) {
            navigation.dispatch(reset('TabsNavigator'))
        } else {
            navigation.dispatch(reset('LockScreen'))
        }
    }

    const handleGoToReleaseNotes = () => {
        // TODO: replace with real link
        Linking.openURL('https://fedi.xyz')
    }

    const handleUpdate = () => {
        // TODO: replace with real link
        Linking.openURL('https://fedi.xyz')
    }

    const style = styles(theme, insets)

    // TODO: populate with real data
    const version = '26.4.2'
    // TODO: populate with real data
    const releaseNotesText = `Release notes wheeeeeee`

    return (
        <SafeAreaContainer edges="bottom">
            <GradientView style={style.header} variant="sky">
                <Column style={style.headerImageContainer}>
                    <Image
                        source={Images.AppUpdate}
                        style={style.headerImage}
                    />
                    <PressableIcon
                        svgName="Close"
                        onPress={handleClose}
                        containerStyle={style.closeButton}
                    />
                </Column>
            </GradientView>
            <GradientView style={style.banner} variant="sky-banner">
                <SvgImage name="NorthStar" size={24} />
                <Text caption>
                    {t('feature.updates.version-is-available', { version })}
                </Text>
            </GradientView>
            <ScrollView contentContainerStyle={style.body} style={{ flex: 1 }}>
                <Column gap="sm">
                    <Text h2 medium>
                        {t('feature.updates.new-release-available')}
                    </Text>
                    <Text>
                        <Trans
                            t={t}
                            i18nKey="feature.updates.new-release-description"
                            components={{
                                link: (
                                    <Text
                                        style={style.link}
                                        onPress={handleGoToReleaseNotes}
                                    />
                                ),
                            }}
                            values={{ version }}
                        />
                    </Text>
                </Column>
                <Column style={style.releaseNotesContainer} gap="sm">
                    <Text caption bold>
                        {t('feature.updates.whats-new-in-version', { version })}
                    </Text>
                    <Text caption>{releaseNotesText}</Text>
                </Column>
            </ScrollView>
            <Column gap="sm" style={style.buttons}>
                <Button
                    title={t('phrases.update-now')}
                    onPress={handleUpdate}
                />
                <Button
                    title={t('phrases.not-now')}
                    onPress={handleClose}
                    outline
                />
            </Column>
        </SafeAreaContainer>
    )
}

const styles = (theme: Theme, insets: EdgeInsets) =>
    StyleSheet.create({
        header: {
            paddingTop: insets.top,
            paddingBottom: theme.spacing.sm,
        },
        headerImageContainer: {
            position: 'relative',
            minHeight: 200,
        },
        headerImage: {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            resizeMode: 'contain',
        },
        closeButton: {
            position: 'absolute',
            top: theme.spacing.lg,
            right: theme.spacing.lg,
            backgroundColor: theme.colors.white,
        },
        banner: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: theme.spacing.sm,
            gap: theme.spacing.sm,
        },
        body: {
            padding: theme.spacing.lg,
            gap: theme.spacing.lg,
            flex: 1,
        },
        link: {
            color: theme.colors.blue,
            textDecorationLine: 'underline',
        },
        buttons: {
            padding: theme.spacing.lg,
            gap: theme.spacing.sm,
        },
        releaseNotesContainer: {
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            backgroundColor: theme.colors.primary05,
            borderColor: theme.colors.extraLightGrey,
            borderWidth: 1,
            borderRadius: 16,
        },
    })
