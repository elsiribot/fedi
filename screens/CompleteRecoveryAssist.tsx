import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, CheckBox, Icon, Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import Video from 'react-native-video'

import LineBreak from '../components/ui/LineBreak'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useBridge } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'CompleteRecoveryAssist'
>

const CompleteRecoveryAssist: React.FC<Props> = ({
    navigation,
    route,
}: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { approveSocialRecoveryRequest, denySocialRecoveryRequest } =
        useBridge()
    const { toast } = useEnvironmentContext().state
    const { videoPath, recoveryId } = route.params
    const [isPaused, setIsPaused] = useState(true)
    const [approvalSelected, setApprovalSelected] = useState(false)
    const [denialSelected, setDenialSelected] = useState(false)
    const [approving, setApproving] = useState(false)

    const handleGuardianApproval = async () => {
        try {
            setApproving(true)
            await approveSocialRecoveryRequest(recoveryId)
            navigation.replace('RecoveryAssistSuccess')
        } catch (error) {
            const typedError = error as Error
            console.error(typedError)
            toast?.show(typedError?.message, 3000)
        }
        setApproving(false)
    }

    const handleGuardianDenial = async () => {
        // FIXME: seeing a success screen when you deny someone is a little unexpected
        navigation.replace('RecoveryAssistSuccess')
    }

    return (
        <ScrollView contentContainerStyle={styles(theme).container}>
            <View style={styles(theme).cameraContainer}>
                <Video
                    source={{ uri: `file://${videoPath}` }} // Can be a URL or a local file.
                    style={[
                        styles(theme).video,
                        isPaused ? styles(theme).shaded : {},
                    ]}
                    paused={isPaused}
                    resizeMode={'contain'}
                    ignoreSilentSwitch={'ignore'}
                    onError={error => {
                        console.error(error)
                    }}
                    onEnd={() => setIsPaused(true)}
                />
                {isPaused && (
                    <Pressable
                        style={styles(theme).playIconContainer}
                        onPress={() => setIsPaused(false)}>
                        <Icon
                            name="play"
                            type="font-awesome"
                            color={theme.colors.white}
                            size={theme.sizes.lg}
                        />
                    </Pressable>
                )}
            </View>

            <LineBreak />
            <Text bold style={styles(theme).instructionsText}>
                {t('feature.recovery.recovery-confirm-identity-instructions-1')}
            </Text>
            <LineBreak />
            <Text bold style={styles(theme).instructionsText}>
                {t('feature.recovery.recovery-confirm-identity-instructions-2')}
            </Text>
            <LineBreak />
            <View style={styles(theme).confirmationContainer}>
                <CheckBox
                    title={
                        <Text caption medium style={styles(theme).checkboxText}>
                            {t(
                                'feature.recovery.recovery-confirm-identity-yes',
                            )}
                        </Text>
                    }
                    checkedIcon="dot-circle-o"
                    uncheckedIcon="circle-o"
                    checked={approvalSelected}
                    onPress={() => {
                        setApprovalSelected(true)
                        setDenialSelected(false)
                    }}
                />
                <CheckBox
                    title={
                        <Text caption medium style={styles(theme).checkboxText}>
                            {t('feature.recovery.recovery-confirm-identity-no')}
                        </Text>
                    }
                    checkedIcon="dot-circle-o"
                    uncheckedIcon="circle-o"
                    checked={denialSelected}
                    onPress={() => {
                        setApprovalSelected(false)
                        setDenialSelected(true)
                    }}
                />
            </View>

            <Button
                title={t('words.continue')}
                onPress={() => {
                    if (approvalSelected) {
                        handleGuardianApproval()
                    } else {
                        handleGuardianDenial()
                    }
                }}
                loading={approving}
                disabled={!approvalSelected && !denialSelected}
                containerStyle={styles(theme).confirmButton}
                titleStyle={styles(theme).titleButton}
            />
        </ScrollView>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            paddingVertical: theme.spacing.xl,
        },
        cameraContainer: {
            height: theme.sizes.socialBackupCameraHeight,
            width: theme.sizes.socialBackupCameraWidth,
            borderWidth: 1,
        },
        camera: {
            height: '100%',
            width: '100%',
        },
        checkboxText: {
            paddingHorizontal: theme.spacing.md,
            textAlign: 'left',
        },
        confirmButton: {
            marginTop: theme.spacing.lg,
            width: '90%',
        },
        confirmationContainer: {
            flex: 1,
            alignItems: 'flex-start',
            paddingHorizontal: theme.spacing.md,
            marginHorizontal: 0,
        },
        instructionsText: {
            alignSelf: 'flex-start',
            textAlign: 'left',
            paddingHorizontal: theme.spacing.xl,
        },
        playIconContainer: {
            position: 'absolute',
            justifyContent: 'center',
            alignItems: 'center',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
        },
        shaded: {
            backgroundColor: theme.colors.grey,
        },
        video: {
            height: '100%',
            width: '100%',
        },
        titleButton: {
            fontFamily: 'AlbertSans-Regular',
        },
    })

export default CompleteRecoveryAssist
