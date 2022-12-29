import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, CheckBox, Icon, Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dimensions, Pressable, StyleSheet, View } from 'react-native'
import Video from 'react-native-video'

import LineBreak from '../components/ui/LineBreak'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useBridge } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'RecoveryAssistConfirmation'
>

const RecoveryAssistConfirmation: React.FC<Props> = ({
    navigation,
    route,
}: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { approveSocialRecoveryRequest, denySocialRecoveryRequest } =
        useBridge()
    const { toast } = useEnvironmentContext().state
    const { userPublicKey, videoUrl } = route.params
    const [isPaused, setIsPaused] = useState(true)
    const [approvalSelected, setApprovalSelected] = useState(false)
    const [denialSelected, setDenialSelected] = useState(false)

    console.info('userPublicKey', userPublicKey)

    const handleGuardianApproval = async () => {
        try {
            await approveSocialRecoveryRequest(userPublicKey)
            navigation.navigate('RecoveryAssistSuccess')
        } catch (error) {
            const typedError = error as Error
            console.error(typedError)
            toast?.show(typedError?.message, 3000)
        }
    }

    const handleGuardianDenial = async () => {
        try {
            await denySocialRecoveryRequest(userPublicKey)
            // TODO: Go to denial screen once design is provided
            navigation.navigate('RecoveryAssistSuccess')
        } catch (error) {
            const typedError = error as Error
            console.error(typedError)
            toast?.show(typedError?.message, 3000)
        }
    }

    return (
        <View style={styles(theme).container}>
            <View style={styles(theme).cameraContainer}>
                <Video
                    source={{ uri: videoUrl }} // Can be a URL or a local file.
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
            <CheckBox
                center
                title={t('feature.recovery.recovery-confirm-identity-yes')}
                checkedIcon="dot-circle-o"
                uncheckedIcon="circle-o"
                checked={approvalSelected}
                onPress={() => {
                    setApprovalSelected(true)
                    setDenialSelected(false)
                }}
            />
            <CheckBox
                center
                title={t('feature.recovery.recovery-confirm-identity-no')}
                checkedIcon="dot-circle-o"
                uncheckedIcon="circle-o"
                checked={denialSelected}
                onPress={() => {
                    setApprovalSelected(false)
                    setDenialSelected(true)
                }}
            />

            <Button
                title={t('words.continue')}
                onPress={() => {
                    if (approvalSelected) {
                        handleGuardianApproval()
                    } else {
                        handleGuardianDenial()
                    }
                }}
                disabled={approvalSelected && denialSelected}
                containerStyle={styles(theme).confirmButton}
            />
        </View>
    )
}

const CAMERA_SIZE = Dimensions.get('window').width * 0.9

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            alignItems: 'center',
            width: '100%',
        },
        confirmButton: {
            marginTop: theme.spacing.xl,
            width: '90%',
        },
        cameraContainer: {
            height: CAMERA_SIZE,
            width: CAMERA_SIZE,
            borderWidth: 3,
        },
        camera: {
            height: '100%',
            width: '100%',
        },
        instructionsText: {
            textAlign: 'left',
            fontWeight: '400',
            width: '90%',
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
    })

export default RecoveryAssistConfirmation
