import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    ActivityIndicator,
    Dimensions,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { Images } from '../assets/images'

import {
    BridgeEventEmitter,
    GuardianApproval,
    SocialRecoveryEvent,
} from '../bridge'
import HoloCard from '../components/ui/HoloCard'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import {
    updateFederationCredentials,
    useFederationsContext,
} from '../state/contexts/FederationsContext'
import { useBridge } from '../state/hooks'
import { resetAfterSocialRecovery } from '../state/navigation'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'CompleteSocialRecovery'
>

const QR_CODE_SIZE = Dimensions.get('window').width * 0.7

const CompleteSocialRecovery: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { toast } = useEnvironmentContext().state
    const {
        completeSocialRecovery,
        getXmppCredentials,
        socialRecoveryApprovals,
    } = useBridge()
    const { selectedFederation } = useFederationsContext().state
    const dispatch = useFederationsContext().dispatch
    const [recovering, setRecovering] = useState(false)

    const [approvals, setApprovals] = useState<SocialRecoveryEvent | undefined>(
        undefined,
    )
    const { recoveryQr } = useBridge()
    const [recoveryQrCode, setRecoveryQrCode] = useState<string>('')

    useEffect(() => {
        const getRecoveryAssistCode = async () => {
            try {
                const recoveryAssistCode = await recoveryQr()
                console.info('recoveryAssistCode', recoveryAssistCode)
                setRecoveryQrCode(JSON.stringify(recoveryAssistCode))
            } catch (error) {
                const typedError = error as Error
                toast?.show(typedError?.message, 3000)
            }
        }

        getRecoveryAssistCode()
    }, [navigation, recoveryQr, toast])

    const socialRecoveryHandler = useCallback(
        (event: SocialRecoveryEvent) => {
            // Ignore all events not from the selectedFederation
            if (selectedFederation!.name !== event.federationId) {
                return
            }
        },
        [selectedFederation],
    )

    // ask bridge every second
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const _approvals = await socialRecoveryApprovals()
                setApprovals(_approvals)
            } catch (e) {
                toast?.show('Failed to fetch guardian approval', 3000)
                console.log('failed to get approvals', e)
            }
        }, 1000)

        if (recovering) {
            clearInterval(interval)
        } else {
            return () => clearInterval(interval)
        }
    }, [toast, recovering, socialRecoveryApprovals, setApprovals])

    useEffect(() => {
        const emitter = new BridgeEventEmitter()
        const listener = emitter.onSocialRecovery(socialRecoveryHandler)
        return () => listener.remove()
    }, [navigation, socialRecoveryHandler])

    useEffect(() => {
        const completeRecovery = async () => {
            try {
                let username = await completeSocialRecovery()
                console.log('recovered username', username)
                if (username != null) {
                    const credentials = await getXmppCredentials()
                    const { password } = credentials
                    dispatch(updateFederationCredentials(username, password))
                }
                setRecovering(false)
                navigation.dispatch(resetAfterSocialRecovery())
            } catch (e) {
                // FIXME: internationalize
                toast?.show("Couldn't complete social recovery", 3000)
            }
        }
        if (recovering) {
            completeRecovery()
        }
    }, [
        completeSocialRecovery,
        dispatch,
        getXmppCredentials,
        navigation,
        recovering,
        toast,
    ])

    const renderGuardianApprovalStatus = () => {
        if (approvals?.remaining === 0) {
            return <Text bold>{`(${t('words.complete')})`}</Text>
        } else {
            return (
                <Text bold>
                    {`(${approvals?.remaining} ${t('words.remaining')})`}
                </Text>
            )
        }
    }

    const renderGuardians = () => {
        return (
            approvals &&
            approvals.approvals.map((approval: GuardianApproval, i) => {
                return (
                    <View style={styles(theme).guardianRow} key={`gr-${i}`}>
                        <Text>{approval.guardianName}</Text>
                        <Text
                            style={
                                approval.approved ? styles(theme).completed : {}
                            }>
                            {/* FIXME: internationalize */}
                            {approval.approved ? 'approved' : 'pending'}
                        </Text>
                    </View>
                )
            })
        )
    }

    // Show loading indicator until we have approvals
    if (approvals == null) {
        return <ActivityIndicator />
    }

    return (
        <ScrollView contentContainerStyle={styles(theme).container}>
            <Text style={styles(theme).instructionsText}>
                {t('feature.recovery.guardian-approval-instructions')}
            </Text>
            <HoloCard
                body={
                    recoveryQrCode ? (
                        <QRCode
                            value={recoveryQrCode}
                            size={QR_CODE_SIZE}
                            logo={Images.FediQrLogo}
                        />
                    ) : (
                        <ActivityIndicator />
                    )
                }
            />

            <View style={styles(theme).guardiansContainer}>
                <View style={styles(theme).guardianRow}>
                    <Text bold>
                        {t('feature.recovery.guardian-approvals')}
                        {'\n'}
                    </Text>
                    {renderGuardianApprovalStatus()}
                </View>
                {renderGuardians()}
            </View>
            <Button
                title={t('feature.recovery.complete-social-recovery')}
                containerStyle={[
                    styles(theme).completeButton,
                    approvals?.remaining > 0 ? styles(theme).hidden : {},
                ]}
                loading={recovering}
                onPress={() => setRecovering(true)}
            />
        </ScrollView>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing.xl,
        },
        completed: {
            color: theme.colors.success,
        },
        completeButton: {
            width: '100%',
            marginTop: 'auto',
        },
        guardiansContainer: {
            width: '100%',
            marginVertical: theme.spacing.xl,
        },
        guardianRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
        },
        hidden: {
            opacity: 0,
        },
        instructionsText: {
            textAlign: 'center',
            paddingHorizontal: theme.spacing.xl,
            marginBottom: theme.spacing.lg,
        },
        openButton: {
            width: '100%',
        },
    })

export default CompleteSocialRecovery
