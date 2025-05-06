import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import {
    ImageBackground,
    StyleSheet,
    useWindowDimensions,
    Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useToast } from '@fedi/common/hooks/toast'
import {
    selectIsMatrixReady,
    selectHasSetMatrixDisplayName,
    startMatrixClient,
    setMatrixDisplayName,
} from '@fedi/common/redux'
//import { flagUserCreatedOnThisDevice } from '@fedi/common/redux/support'
import { generateRandomDisplayName } from '@fedi/common/utils/chat'
import { makeLog } from '@fedi/common/utils/log'

import { Images } from '../assets/images'
import { fedimint } from '../bridge'
import Flex from '../components/ui/Flex'
import SvgImage, { SvgImageSize } from '../components/ui/SvgImage'
import { usePinContext } from '../state/contexts/PinContext'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import { RootStackParamList } from '../types/navigation'

const log = makeLog('Splash')

export type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>

const Splash: React.FC<Props> = ({ navigation }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const { fontScale } = useWindowDimensions()
    const pin = usePinContext()

    const dispatch = useAppDispatch()
    const toast = useToast()
    const isMatrixReady = useAppSelector(selectIsMatrixReady)
    const hasSetDisplayName = useAppSelector(selectHasSetMatrixDisplayName)

    const generateAndSetUsername = async () => {
        try {
            if (!isMatrixReady) {
                await dispatch(startMatrixClient({ fedimint })).unwrap()
            }

            if (!hasSetDisplayName) {
                const name = generateRandomDisplayName(2)
                await dispatch(
                    setMatrixDisplayName({ displayName: name }),
                ).unwrap()
                //  dispatch(flagUserCreatedOnThisDevice())
            }
            return true
        } catch (error) {
            toast.show('Please ensure you are online to continue')
            return false
        }
    }

    const handleContinue = async () => {
        navigation.navigate('PublicFederations')
        await generateAndSetUsername()
    }
    const handleReturningUser = async () => {
        navigation.navigate('ChooseRecoveryMethod')
    }

    // PINs are stored in the keychain and persist between app installs
    // so if we are on the Splash screen and a PIN is set, we need to clear it
    useEffect(() => {
        if (pin.status === 'set') {
            log.info('Persisted PIN found from past install, clearing it.')
            pin.unset()
        }
    }, [pin])

    const style = styles(theme, fontScale)
    return (
        <ImageBackground
            source={Images.WelcomeBackground}
            style={style.container}>
            <SafeAreaView style={style.content}>
                <Flex
                    grow
                    shrink
                    center
                    gap="sm"
                    fullWidth
                    style={style.welcomeContainer}>
                    <Flex center style={style.iconContainer}>
                        <SvgImage size={SvgImageSize.lg} name="FediLogoIcon" />
                    </Flex>
                    <Text style={style.title}>
                        {t('feature.onboarding.fedi')}
                    </Text>
                    <Text style={style.welcomeText}>
                        {t('feature.onboarding.tagline')}
                    </Text>
                </Flex>

                <Flex
                    grow={false}
                    shrink
                    align="center"
                    justify="evenly"
                    gap="md"
                    fullWidth>
                    <Button
                        fullWidth
                        testID="JoinFederationButton"
                        title={t('feature.onboarding.get-a-wallet')}
                        onPress={handleContinue}
                    />
                    <Button
                        fullWidth
                        onPress={handleReturningUser}
                        day
                        title={t('phrases.recover-my-account')}
                    />
                    <Text style={style.agreementText} small>
                        <Trans
                            i18nKey="feature.onboarding.agree-terms-privacy"
                            components={{
                                termsLink: (
                                    <Text
                                        small
                                        style={style.agreementLink}
                                        onPress={() =>
                                            navigation.navigate('Eula')
                                        }
                                    />
                                ),
                                privacyLink: (
                                    <Text
                                        small
                                        style={style.agreementLink}
                                        onPress={() =>
                                            Linking.openURL(
                                                'https://www.fedi.xyz/privacy-policy',
                                            )
                                        }
                                    />
                                ),
                            }}
                        />
                    </Text>
                </Flex>
            </SafeAreaView>
        </ImageBackground>
    )
}

const styles = (theme: Theme, fontScale: number) =>
    StyleSheet.create({
        container: {
            flex: 1,
            justifyContent: 'flex-end',
        },
        content: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: theme.spacing.xl,
        },
        welcomeContainer: {
            flexBasis: 'auto',
            maxWidth: 320 * Math.max(fontScale, 1),
            paddingHorizontal: theme.spacing.xl,
        },
        iconContainer: {
            marginBottom: theme.spacing.lg,
            width: 32,
            height: 32,
        },
        title: {
            textAlign: 'center',
            fontWeight: 700,
            fontSize: 30,
        },
        welcomeText: {
            textAlign: 'center',
        },
        agreementLink: {
            color: theme.colors.link,
        },
        agreementText: {
            textAlign: 'center',
            width: '70%',
        },
    })

export default Splash
