import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    ActivityIndicator,
    Button,
    NativeModules,
    Share,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import QRCode from 'react-native-qrcode-svg'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import type { RootStackParamList } from '../App'

const {
    FedimintFfi: { generateInvoice },
} = NativeModules

export type Props = NativeStackScreenProps<RootStackParamList, 'Receive'>

const ReceiveOnchain = () => {
    const { t } = useTranslation()
    const [address, setAddress] = useState<string>('')

    useEffect(() => {
        const generateOnchainAddress = async () => {
            // Using hardcoded address until rust FFI is ready
            // const newAddress = await generateOnchainAddress()
            const newAddress = 'bcrt1qaqwtgvfq96f8e3mm2qe394pp2atnz4syzkpv07'

            setAddress(newAddress)
        }

        generateOnchainAddress()
    }, [])

    const copyToClipboard = () => {
        Clipboard.setString(address)
    }

    const openShareDialog = async () => {
        // open share dialog
        try {
            const result = await Share.share({
                message: address,
            })
            console.log(result)
            if (result.action === Share.sharedAction) {
                if (result.activityType) {
                    // shared with activity type of result.activityType
                    console.log(result.activityType)
                } else {
                    // shared
                    console.log(result)
                }
            } else if (result.action === Share.dismissedAction) {
                // dismissed
                console.log('share dialog dismissed')
            }
        } catch (error) {
            console.error(error)
        }
    }

    return (
        <View style={styles.container}>
            <Text>{t('words.important')}!</Text>
            <Text>{t('feature.receive.onchain-notice')}</Text>
            {address ? (
                <>
                    <QRCode value={address} size={300} />
                    <View style={styles.buttonsContainer}>
                        <Button
                            title={t('words.share')}
                            onPress={openShareDialog}
                        />
                        <Button
                            title={t('words.copy')}
                            onPress={copyToClipboard}
                        />
                    </View>
                </>
            ) : (
                <ActivityIndicator />
            )}
        </View>
    )
}

type ReceiveLightningProps = {
    handleInvoice: Function
}

const ReceiveLightning = ({ handleInvoice }: ReceiveLightningProps) => {
    const { t } = useTranslation()
    const [amount, setAmount] = useState<string>('')
    const [amountIsValid, setAmountIsValid] = useState(false)

    useEffect(() => {
        const isNumeric = /^-?\d+$/.test(amount)

        if (amount === '' || amount === '0' || isNumeric === false) {
            setAmountIsValid(false)
        } else {
            setAmountIsValid(true)
        }
    }, [amount])

    const onChangeText = (updatedValue: string) => {
        setAmount(updatedValue)
    }

    const onGenerateInvoice = async () => {
        // call fedimint-ffi to generate invoice
        const newInvoice = await generateInvoice(amount, 'test memo')
        console.log(`generateInvoice: ', ${newInvoice})`)
        handleInvoice(newInvoice)
    }

    return (
        <View>
            <Text>{t('feature.receive.instructions')}</Text>
            <TextInput
                onChangeText={onChangeText}
                value={amount}
                placeholder={`${t('words.amount')} (${t('words.sats')})`}
                keyboardType="numeric"
                returnKeyType="done"
            />
            <Button
                title={t('phrases.generate-invoice')}
                onPress={onGenerateInvoice}
                disabled={!amountIsValid}
            />
        </View>
    )
}

const Receive: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const [walletMode, setWalletMode] = useState<string>('lightning')

    const showInvoice = (invoice: string) => {
        navigation.navigate('LnInvoice', {
            invoice,
        })
    }

    return (
        <View style={styles.container}>
            <View style={styles.buttonsContainer}>
                <Button
                    title={t('words.onchain')}
                    onPress={() => setWalletMode('onchain')}
                    disabled={walletMode === 'onchain'}
                />
                <Button
                    title={t('words.lightning')}
                    onPress={() => setWalletMode('lightning')}
                    disabled={walletMode === 'lightning'}
                />
            </View>

            {walletMode === 'lightning' ? (
                <ReceiveLightning handleInvoice={showInvoice} />
            ) : (
                <ReceiveOnchain />
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonsContainer: {
        width: '90%',
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        margin: 50,
    },
})

export default Receive
