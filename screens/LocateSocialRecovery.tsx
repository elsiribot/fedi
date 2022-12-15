import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Card, Image, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { View, StyleSheet, ImageBackground } from 'react-native'

import { Images } from '../assets/images'
import SelectRecoveryFileButton from '../components/feature/recovery/SelectRecoveryFileButton'
import { useFederationsContext } from '../contexts/FederationsContext'

import type { RootStackParamList } from '../Router'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'LocateSocialRecovery'
>

const LocateSocialRecovery: React.FC<Props> = () => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { selectedFederation } = useFederationsContext().state

    return (
        <View style={styles(theme).container}>
            <Text style={styles(theme).instructionsText}>
                {t('feature.recovery.social-recovery-instructions')}
            </Text>
            <Card containerStyle={styles(theme).roundedCardContainer}>
                <ImageBackground
                    style={styles(theme).imageBackground}
                    source={Images.HoloBackground}>
                    <Image
                        source={Images.FediFile}
                        style={styles(theme).iconImage}
                    />
                    <Text h4>
                        {'\n'}
                        {t('feature.recovery.locate-social-recovery-file')}
                    </Text>
                    <View>
                        <Text>
                            {'\n'}
                            {t(
                                'feature.recovery.locate-social-recovery-instructions-1',
                            )}
                            {'\n'}
                        </Text>
                        <Text>
                            {t(
                                'feature.recovery.locate-social-recovery-instructions-2',
                            )}
                        </Text>
                        <Text>
                            {'  \u2022 '}
                            {t(
                                'feature.recovery.locate-social-recovery-instructions-check-1',
                            )}
                        </Text>
                        <Text>
                            {'  \u2022 '}
                            {t(
                                'feature.recovery.locate-social-recovery-instructions-check-2',
                            )}
                        </Text>
                        <Text>
                            {'  \u2022 '}
                            {t(
                                'feature.recovery.locate-social-recovery-instructions-check-3',
                            )}
                        </Text>
                        <Text>
                            {'  \u2022 '}
                            {t(
                                'feature.recovery.locate-social-recovery-instructions-check-4',
                            )}
                        </Text>
                        <Text>
                            {'\n'}
                            {t(
                                'feature.recovery.locate-social-recovery-instructions-3',
                            )}
                        </Text>
                        <Text style={styles(theme).boldText}>
                            {t('feature.recovery.default-fedi-file-format', {
                                federation: selectedFederation?.name,
                            })}
                            {'\n'}
                        </Text>
                    </View>
                    <SelectRecoveryFileButton />
                </ImageBackground>
            </Card>
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: 24,
        },
        boldText: {
            fontWeight: '900',
        },
        iconImage: {
            marginTop: 8,
            height: theme.sizes.sm,
            width: theme.sizes.sm,
        },
        imageBackground: {
            padding: 20,
            alignItems: 'center',
        },
        instructionsText: {
            textAlign: 'center',
            paddingHorizontal: 24,
            fontWeight: '400',
        },
        roundedCardContainer: {
            borderRadius: 16,
            width: '100%',
            marginHorizontal: 0,
            padding: 0,
        },
    })

export default LocateSocialRecovery
