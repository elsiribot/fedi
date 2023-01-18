import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'

import { Images } from '../assets/images'
import {
    GuardianApproval,
    SocialRecoveryEvent,
    TFedimintEventEmitter,
} from '../bridge'
import HoloCard from '../components/ui/HoloCard'
import { useFederationsContext } from '../state/contexts/FederationsContext'
import { useBridge } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'CompleteSocialRecovery'
>

const CompleteSocialRecovery: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { socialRecoveryApprovals } = useBridge()
    const { selectedFederation } = useFederationsContext().state
    const [guardianApprovals, setGuardianApprovals] = useState<number>(0)
    const [guardianDenials, setGuardianDenials] = useState<number>(0)

    const [approvals, setApprovals] = useState<SocialRecoveryEvent | undefined>(
        undefined,
    )

    const socialRecoveryHandler = useCallback(
        (event: SocialRecoveryEvent) => {
            // Ignore all events not from the selectedFederation
            if (selectedFederation!.name !== event.federationId) {
                return
            }
            console.log('event')
            console.log(event)
            setGuardianApprovals(
                event.approvals?.filter(a => a.approved).length,
            )
            // setGuardianDenials(
            //     event.approvals?.filter(a => a.status === 'denied').length,
            // )
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
                console.log('failed to get approvals', e)
            }
        }, 1000)
        return () => clearInterval(interval)
    }, [socialRecoveryApprovals, setApprovals])

    useEffect(() => {
        const emitter = new TFedimintEventEmitter()
        emitter.onSocialRecovery(socialRecoveryHandler)

        return () => {
            emitter.removeListener('socialRecovery')
        }
    }, [navigation, socialRecoveryHandler])

    useEffect(() => {
        if (guardianDenials > (selectedFederation?.denialThreshold as number)) {
            navigation.navigate('SocialRecoveryFailure')
        }
    }, [guardianDenials, selectedFederation?.denialThreshold, navigation])

    const showQrCode = () => {
        navigation.navigate('SocialRecoveryQrModal')

        // TODO: Remove simulated approval when bridge is emitting events
        setTimeout(() => {
            // Mock guardian approvals 5s after every QR code display
            setGuardianApprovals(
                Math.min(
                    selectedFederation?.approvalsRequired as number,
                    guardianApprovals + 1,
                ),
            )
            // Mock guardian denial
            // setGuardianDenials(Math.min(guardianDenials + 1))
        }, 5000)
    }

    const renderGuardianApprovalStatus = () => {
        if (guardianApprovals === selectedFederation?.approvalsRequired) {
            return <Text bold>{`(${t('words.complete')})`}</Text>
        } else {
            return (
                <Text bold>
                    {`(${
                        (selectedFederation?.approvalsRequired as number) -
                        guardianApprovals
                    } ${t('words.required')})`}
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

    return (
        <ScrollView contentContainerStyle={styles(theme).container}>
            <Text style={styles(theme).instructionsText}>
                {t('feature.recovery.guardian-approval-instructions')}
            </Text>
            <HoloCard
                iconImage={Images.SocialPeople}
                title={t('feature.recovery.social-recovery-steps')}
                body={
                    <>
                        <View>
                            <Text>
                                {t('feature.recovery.guardian-approval-step-1')}
                                {'\n'}
                            </Text>
                            <Text>
                                {t('feature.recovery.guardian-approval-step-2')}
                                {'\n'}
                            </Text>
                            <Text>
                                {t('feature.recovery.guardian-approval-step-3')}
                                {'\n'}
                            </Text>
                            <Text>
                                {t('feature.recovery.guardian-approval-step-4')}
                                {'\n'}
                            </Text>
                        </View>
                        <Button
                            title={t('feature.recovery.open-qr-code')}
                            containerStyle={styles(theme).openButton}
                            onPress={showQrCode}
                        />
                    </>
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
                    guardianApprovals < selectedFederation?.approvalsRequired!
                        ? styles(theme).hidden
                        : {},
                ]}
                onPress={() => {
                    navigation.navigate('SocialRecoverySuccess')
                }}
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
