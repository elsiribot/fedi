import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import {
    Button,
    Card,
    Input,
    InputProps,
    Text,
    Theme,
    useTheme,
} from '@rneui/themed'
import React, {
    PropsWithChildren,
    Ref,
    RefObject,
    useRef,
    useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { View, StyleSheet, Pressable, TextInput } from 'react-native'
import { SeedWords } from '../bridge'
import { useBridge } from '../contexts/FederationsContext'

import type { RootStackParamList } from '../types/navigation'
import stringUtils from '../utils/StringUtils'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'PersonalRecovery'
>

type SeedWordInputProps = {
    number: number
    word: string
    onInputUpdated: (value: string) => void
}

const SeedWordInput = ({
    number,
    word,
    onInputUpdated,
}: SeedWordInputProps) => {
    const { theme } = useTheme()
    const inputRef = useRef<TextInput | null>(null)
    const [isFocused, setIsFocused] = useState(false)

    console.log('word', word)

    return (
        <Pressable
            style={styles(theme).wordContainer}
            onPress={() => {
                if (!inputRef.current) return
                const current: TextInput = inputRef.current
                current.focus()
            }}>
            <Text h4 h4Style={styles(theme).wordNumber}>{`${number}`}</Text>
            <Input
                ref={(ref: any) => {
                    inputRef.current = ref
                }}
                // ref={inputRef}
                value={word}
                onChangeText={onInputUpdated}
                autoCorrect={false}
                containerStyle={styles(theme).wordInputOuterContainer}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                inputContainerStyle={[
                    styles(theme).wordInputInnerContainer,
                    isFocused ? styles(theme).focusedInputInnerContainer : {},
                ]}
                inputStyle={[
                    styles(theme).wordInput,
                    isFocused ? styles(theme).focusedInput : {},
                ]}
                autoCapitalize={'none'}
                returnKeyType={'next'}
            />
        </Pressable>
    )
}

const PersonalRecovery: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { recoverFromMnemonic } = useBridge()
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [seedWords, setSeedWords] = useState<SeedWords>(
        new Array(12).fill(''),
    )

    const handleInputUpdate = (inputValue: string, index: number) => {
        const validatedInput = stringUtils.keepOnlyLowercaseLetters(inputValue)

        setSeedWords([
            ...seedWords.slice(0, index),
            validatedInput,
            ...seedWords.slice(index + 1),
        ])
    }

    const renderFirstSixSeedWords = () => {
        return seedWords
            .slice(0, 6)
            .map((s, i) => (
                <SeedWordInput
                    key={`sw-f6-${i}`}
                    number={i + 1}
                    word={s}
                    onInputUpdated={value => handleInputUpdate(value, i)}
                />
            ))
    }
    const renderLastSixSeedWords = () => {
        return seedWords
            .slice(-6)
            .map((s, i) => (
                <SeedWordInput
                    key={`sw-l6-${i}`}
                    number={i + 7}
                    word={s}
                    onInputUpdated={value => handleInputUpdate(value, i + 6)}
                />
            ))
    }

    return (
        <View style={styles(theme).container}>
            <Text h4 h4Style={styles(theme).instructionsText}>
                {t('feature.recovery.personal-recovery-instructions')}
            </Text>
            <Card containerStyle={styles(theme).roundedCardContainer}>
                <View style={styles(theme).twoColumnContainer}>
                    <View style={styles(theme).seedWordsContainer}>
                        {renderFirstSixSeedWords()}
                    </View>
                    <View style={styles(theme).seedWordsContainer}>
                        {renderLastSixSeedWords()}
                    </View>
                </View>
            </Card>
            <Button
                title={t('feature.recovery.recover-wallet')}
                containerStyle={styles(theme).continueButton}
                onPress={async () => {
                    try {
                        setIsLoading(true)
                        await recoverFromMnemonic(seedWords)
                        setIsLoading(false)
                        navigation.replace('PersonalRecoverySuccess')
                    } catch (error) {
                        // TODO: show error toast
                    }
                }}
                disabled={isLoading || seedWords.some(s => s.length === 0)}
            />
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'flex-start',
            padding: 24,
        },
        continueButton: {
            width: '100%',
            marginBottom: 16,
            marginTop: 'auto',
        },
        instructionsText: {
            textAlign: 'left',
            fontWeight: '400',
        },
        roundedCardContainer: {
            borderRadius: 16,
            width: '100%',
            marginHorizontal: 0,
            padding: 24,
        },
        seedWordsContainer: {
            flex: 1,
            alignItems: 'flex-start',
        },
        twoColumnContainer: {
            flexDirection: 'row',
        },
        wordContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginVertical: 2,
        },
        wordNumber: {
            color: theme.colors.primaryVeryLight,
            paddingLeft: 0,
            width: '20%',
            textAlign: 'center',
        },
        wordInputOuterContainer: {
            width: '75%',
            flexDirection: 'row',
            alignItems: 'center',
        },
        wordInputInnerContainer: {
            borderBottomColor: 'transparent',
        },
        wordInput: {
            fontSize: 16,
        },
        focusedInputInnerContainer: {
            borderBottomColor: theme.colors.primary,
            marginBottom: 12,
        },
        focusedInput: {
            marginBottom: 0,
        },
    })

export default PersonalRecovery
