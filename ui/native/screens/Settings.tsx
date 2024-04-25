import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    Alert,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native'
import Share from 'react-native-share'

import { useNuxStep } from '@fedi/common/hooks/nux'
import { useToast } from '@fedi/common/hooks/toast'
import { useExportTransactions } from '@fedi/common/hooks/transactions'
import {
    changeAuthenticatedGuardian,
    leaveFederation,
    resetFederationChatState,
    selectAlphabeticallySortedFederations,
    selectCurrency,
    selectDeveloperMode,
    selectMatrixAuth,
    selectStableBalance,
    selectStableBalancePending,
    setActiveFederationId,
    setDeveloperMode,
} from '@fedi/common/redux'
import amountUtils from '@fedi/common/utils/AmountUtils'
import {
    getFederationTosUrl,
    shouldShowInviteCode,
    supportsSingleSeed,
} from '@fedi/common/utils/FederationUtils'
import { makeLog } from '@fedi/common/utils/log'
import { encodeFediMatrixUserUri } from '@fedi/common/utils/matrix'

import { fedimint } from '../bridge'
import SettingsItem from '../components/feature/admin/SettingsItem'
import QRCodeContainer from '../components/ui/QRCodeContainer'
import SvgImage from '../components/ui/SvgImage'
import { version } from '../package.json'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import { Federation } from '../types'
import type { RootStackParamList } from '../types/navigation'
import { usePin } from '../utils/hooks/security'

const log = makeLog('Settings')

export type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>

const Settings: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const dispatch = useAppDispatch()
    const matrixAuth = useAppSelector(selectMatrixAuth)
    const toast = useToast()
    const exportTransactions = useExportTransactions(fedimint)

    const [exportingFederationId, setExportingFederationId] =
        useState<string>('')

    const [unlockDevModeCount, setUnlockDevModeCount] = useState<number>(0)

    const authenticatedGuardian = useAppSelector(
        s => s.federation.authenticatedGuardian,
    )
    const developerMode = useAppSelector(selectDeveloperMode)
    const stableBalance = useAppSelector(selectStableBalance)
    const pendingStableBalance = useAppSelector(selectStableBalancePending)
    const currency = useAppSelector(selectCurrency)
    const { status } = usePin()
    const [hasPerformedPersonalBackup] = useNuxStep(
        'hasPerformedPersonalBackup',
    )

    const resetChatState = useCallback(
        (federationId: string) => {
            if (federationId) {
                dispatch(
                    resetFederationChatState({
                        federationId,
                    }),
                )
            }
        },
        [dispatch],
    )

    const resetGuardiansState = useCallback(() => {
        dispatch(changeAuthenticatedGuardian(null))
    }, [dispatch])

    // FIXME: this needs some kind of loading state
    // TODO: this should be an thunkified action creator
    const handleLeaveFederation = useCallback(
        async (federation: Federation) => {
            try {
                // FIXME: currently this specific order of operations fixes a
                // bug where the username would get stuck in storage and when
                // rejoining the federation, the user cannot create an new
                // username with the fresh seed and the stored username fails
                // to authenticate so chat ends up totally broken
                // However it's not safe because if leaveFederation fails, then
                // we are resetting state too early and could corrupt things
                // Need to investigate further why running leaveFederation first
                // causes this bug
                resetChatState(federation.id)
                resetGuardiansState()

                await dispatch(
                    leaveFederation({
                        fedimint,
                        federationId: federation.id,
                    }),
                ).unwrap()

                navigation.replace('Initializing')
            } catch (e) {
                toast.show({
                    content: t('errors.failed-to-leave-federation'),
                    status: 'error',
                })
            }
        },
        [navigation, dispatch, resetChatState, resetGuardiansState, toast, t],
    )

    const confirmLeaveFederation = (federation: Federation) => {
        const alertTitle = `${t('feature.federations.leave-federation')} - ${
            federation.name
        }`

        // Don't allow leaving if stable balance exists
        if (stableBalance > 0) {
            Alert.alert(
                alertTitle,
                t(
                    'feature.federations.leave-federation-withdraw-stable-first',
                    { currency },
                ),
                [
                    {
                        text: t('words.okay'),
                    },
                ],
            )
        }

        // Don't allow leaving if stable pending balance exists
        else if (pendingStableBalance > 0) {
            Alert.alert(
                alertTitle,
                t(
                    'feature.federations.leave-federation-withdraw-pending-stable-first',
                    { currency },
                ),
                [
                    {
                        text: t('words.okay'),
                    },
                ],
            )
        }

        // Don't allow leaving sats balance is greater than 100
        else if (amountUtils.msatToSat(federation.balance) > 100) {
            Alert.alert(
                alertTitle,
                t('feature.federations.leave-federation-withdraw-first'),
                [
                    {
                        text: t('words.okay'),
                    },
                ],
            )
        } else {
            Alert.alert(
                alertTitle,
                t('feature.federations.leave-federation-confirmation'),
                [
                    {
                        text: t('words.no'),
                    },
                    {
                        text: t('words.yes'),
                        onPress: () => handleLeaveFederation(federation),
                    },
                ],
            )
        }
    }

    const exportTransactionsAsCsv = async (federation: Federation) => {
        setExportingFederationId(federation.id)

        const res = await exportTransactions(federation)

        if (res.success) {
            try {
                await Share.open({
                    filename:
                        Platform.OS === 'android'
                            ? res.fileName.slice(0, -4)
                            : res.fileName,
                    type: 'text/csv',
                    url: res.uri,
                })
            } catch {
                /* no-op */
            }
        } else {
            log.error('error', res.message)
            toast.show({
                content: t('errors.failed-to-fetch-transactions'),
                status: 'error',
            })
        }

        setExportingFederationId('')
    }

    const createOrManagePin = () => {
        if (hasPerformedPersonalBackup && status === 'set') {
            navigation.navigate('PinAccess')
        } else if (hasPerformedPersonalBackup) {
            navigation.navigate('SetPin')
        } else {
            navigation.navigate('CreatePinInstructions')
        }
    }

    const sortedFederations = useAppSelector(
        selectAlphabeticallySortedFederations,
    )

    const federationMenus = sortedFederations.map(federation => {
        const tosUrl = getFederationTosUrl(federation.meta)

        const runSocialBackup = () => {
            dispatch(setActiveFederationId(federation.id))
            navigation.navigate('StartSocialBackup')
        }

        return (
            <View key={federation.id} style={styles(theme).sectionContainer}>
                <Text style={styles(theme).sectionTitle}>
                    {federation.name}
                </Text>

                {shouldShowInviteCode(federation.meta) && (
                    <SettingsItem
                        image={<SvgImage name="Qr" />}
                        label={t('feature.federations.invite-members')}
                        onPress={() => {
                            navigation.navigate('FederationInvite', {
                                inviteLink: federation.inviteCode,
                            })
                        }}
                    />
                )}

                {supportsSingleSeed(federation) && (
                    <SettingsItem
                        image={<SvgImage name="SocialPeople" />}
                        label={t('feature.backup.social-backup')}
                        onPress={() => runSocialBackup()}
                    />
                )}

                {tosUrl && (
                    <SettingsItem
                        image={<SvgImage name="Scroll" />}
                        label={t('feature.federations.federation-terms')}
                        actionIcon="ExternalLink"
                        onPress={() => Linking.openURL(tosUrl)}
                    />
                )}

                <SettingsItem
                    image={<SvgImage name="TableExport" />}
                    label={t('feature.backup.export-transactions-to-csv')}
                    onPress={() => exportTransactionsAsCsv(federation)}
                    disabled={!!exportingFederationId}
                />

                <SettingsItem
                    image={<SvgImage name="LeaveFederation" />}
                    label={t('feature.federations.leave-federation')}
                    onPress={() => confirmLeaveFederation(federation)}
                />
            </View>
        )
    })

    const qrValue = encodeFediMatrixUserUri(matrixAuth?.userId || '')

    return (
        <ScrollView contentContainerStyle={styles(theme).container}>
            {matrixAuth && (
                <View style={styles(theme).qrCode}>
                    <QRCodeContainer
                        copyMessage={t('phrases.copied-member-code')}
                        copyValue={qrValue}
                        qrValue={qrValue}
                    />

                    <Text h2 medium numberOfLines={1} adjustsFontSizeToFit>
                        {matrixAuth.displayName}
                    </Text>
                </View>
            )}
            <View>
                <Text style={styles(theme).sectionTitle}>
                    {t('words.general')}
                </Text>
                {developerMode && (
                    <SettingsItem
                        image={<SvgImage name="FediLogoIcon" />}
                        label={'Developer Settings'}
                        onPress={() => navigation.navigate('DeveloperSettings')}
                    />
                )}
                <SettingsItem
                    image={<SvgImage name="User" />}
                    label={t('phrases.edit-profile')}
                    onPress={() => navigation.navigate('EditProfileSettings')}
                />
                <SettingsItem
                    image={<SvgImage name="Apps" />}
                    label={t('feature.fedimods.fedi-mods')}
                    onPress={() => navigation.navigate('FediModSettings')}
                />
                <SettingsItem
                    image={<SvgImage name="Language" />}
                    label={t('words.language')}
                    onPress={() => navigation.navigate('LanguageSettings')}
                />
                <SettingsItem
                    image={<SvgImage name="Usd" />}
                    label={t('phrases.display-currency')}
                    onPress={() => navigation.navigate('CurrencySettings')}
                />
                <SettingsItem
                    image={<SvgImage name="Note" />}
                    label={t('feature.backup.personal-backup')}
                    onPress={() => navigation.navigate('StartPersonalBackup')}
                />
                {authenticatedGuardian !== null && (
                    <SettingsItem
                        image={<SvgImage name="SocialPeople" />}
                        label={t('feature.recovery.recovery-assist')}
                        onPress={() => {
                            navigation.navigate('StartRecoveryAssist')
                        }}
                    />
                )}
                <SettingsItem
                    image={<SvgImage name="LockSecurity" />}
                    label={t('feature.pin.pin-access')}
                    onPress={createOrManagePin}
                />
                <SettingsItem
                    image={<SvgImage name="Bug" />}
                    label={t('feature.bug.report-a-bug')}
                    onPress={() => navigation.navigate('BugReport')}
                />
            </View>

            {federationMenus}

            <View style={styles(theme).versionContainer}>
                <SvgImage
                    name="FediLogoIcon"
                    containerStyle={styles(theme).logo}
                />
                <Pressable
                    onPress={() => {
                        setUnlockDevModeCount(unlockDevModeCount + 1)
                        if (unlockDevModeCount > 21) {
                            if (developerMode) {
                                toast.show(
                                    t(
                                        'feature.developer.developer-mode-deactivated',
                                    ),
                                )
                                dispatch(setDeveloperMode(false))
                            } else {
                                toast.show(
                                    t(
                                        'feature.developer.developer-mode-activated',
                                    ),
                                )
                                dispatch(setDeveloperMode(true))
                            }
                        }
                    }}>
                    <Text>{t('phrases.app-version', { version })}</Text>
                </Pressable>
            </View>
        </ScrollView>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            justifyContent: 'space-evenly',
            padding: theme.spacing.lg,
            paddingTop: 0,
        },
        profileHeader: {
            alignItems: 'center',
            padding: theme.spacing.lg,
            borderRadius: theme.borders.defaultRadius,
            borderColor: theme.colors.primaryLight,
        },
        actionsContainer: {
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignSelf: 'flex-start',
        },
        avatarContainer: {
            marginTop: theme.spacing.sm,
            marginBottom: theme.spacing.md,
        },
        sectionContainer: {
            flexDirection: 'column',
            alignItems: 'flex-start',
        },
        sectionTitle: {
            color: theme.colors.primaryLight,
            paddingVertical: theme.spacing.sm,
        },
        versionContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.offWhite,
            padding: theme.spacing.md,
            borderRadius: theme.borders.defaultRadius,
            marginTop: theme.spacing.md,
        },
        logo: {
            marginBottom: theme.spacing.sm,
        },
        qrCode: {
            alignItems: 'center',
            gap: theme.spacing.lg,
        },
    })

export default Settings
