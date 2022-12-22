import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { Images } from '../assets/images'
import HoloCard from '../components/ui/HoloCard'
import LineBreak from '../components/ui/LineBreak'
import { useFederationsContext } from '../contexts/FederationsContext'

import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ChooseRecoveryMethod'
>

const ChooseRecoveryMethod: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { selectedFederation } = useFederationsContext().state

    return (
        <View style={styles(theme).container}>
            <Text style={styles(theme).instructionsText}>
                {t('feature.recovery.choose-method-instructions', {
                    federation: selectedFederation?.name,
                })}
            </Text>

            <HoloCard
                iconImage={Images.SocialPeople}
                title={t('feature.recovery.social-recovery')}
                body={
                    <>
                        <Text style={styles(theme).recoveryMethodInstructions}>
                            {t('feature.recovery.social-recovery-method')}
                        </Text>
                        <Button
                            title={t('feature.recovery.start-social-recovery')}
                            containerStyle={styles(theme).recoveryMethodButton}
                            onPress={() =>
                                navigation.navigate('LocateSocialRecovery')
                            }
                        />
                    </>
                }
            />
            <LineBreak />
            <HoloCard
                iconImage={Images.Note}
                title={t('feature.recovery.personal-recovery')}
                body={
                    <>
                        <Text style={styles(theme).recoveryMethodInstructions}>
                            {t('feature.recovery.personal-recovery-method')}
                        </Text>
                        <Button
                            title={t(
                                'feature.recovery.start-personal-recovery',
                            )}
                            containerStyle={styles(theme).recoveryMethodButton}
                            onPress={() => {
                                navigation.navigate('PersonalRecovery')
                            }}
                        />
                    </>
                }
            />
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: theme.spacing.xl,
        },
        instructionsText: {
            textAlign: 'center',
            marginBottom: theme.spacing.xl,
            paddingHorizontal: theme.spacing.md,
        },
        recoveryMethodButton: {
            width: '100%',
            marginTop: theme.spacing.md,
        },
        recoveryMethodInstructions: {
            textAlign: 'center',
            paddingVertical: theme.spacing.xs,
        },
    })

export default ChooseRecoveryMethod
