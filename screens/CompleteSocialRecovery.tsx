import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View, StyleSheet } from 'react-native'

import { Images } from '../assets/images'

import type { RootStackParamList } from '../types/navigation'
import { useFederationsContext } from '../contexts/FederationsContext'
import { Node, SocialRecoveryEvent, TFedimintEventEmitter } from '../bridge'
import HoloCard from '../components/ui/HoloCard'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'CompleteSocialRecovery'
>

const CompleteSocialRecovery: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { selectedFederation } = useFederationsContext().state
    const [guardianApprovals, setGuardianApprovals] = useState<number>(0)
    const [guardianDenials, setGuardianDenials] = useState<number>(0)

    const socialRecoveryHandler = useCallback(
        (event: SocialRecoveryEvent) => {
            // Ignore all events not from the selectedFederation
            if (selectedFederation!.name !== event.federationId) {
                return
            }
            console.log('event')
            console.log(event)
            setGuardianApprovals(
                event.approvals?.filter(a => a.status === 'approved').length,
            )
            setGuardianDenials(
                event.approvals?.filter(a => a.status === 'denied').length,
            )
        },
        [selectedFederation],
    )

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
        // Mock guardian approvals 5s after every QR code display
        navigation.navigate('SocialRecoveryQrModal')

        setTimeout(() => {
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
            return <Text h4>{`(${t('words.complete')})`}</Text>
        } else {
            return (
                <Text h4>
                    {`(${
                        (selectedFederation?.approvalsRequired as number) -
                        guardianApprovals
                    } ${t('words.required')})`}
                </Text>
            )
        }
    }

    const renderGuardians = () => {
        return selectedFederation?.nodes.map((n: Node, i) => {
            const approvalStatus =
                guardianApprovals >= 1 ? 'approved' : 'pending'

            return (
                <View style={styles(theme).guardianRow} key={`gr-${i}`}>
                    <Text>{n.name}</Text>
                    <Text
                        style={
                            approvalStatus === 'approved'
                                ? styles(theme).completed
                                : {}
                        }>
                        {approvalStatus}
                    </Text>
                </View>
            )
        })
    }

    return (
        <View style={styles(theme).container}>
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
                    <Text h4>
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
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
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
            fontWeight: '400',
        },
        openButton: {
            width: '100%',
        },
    })

export default CompleteSocialRecovery
