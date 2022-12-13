import { useNavigation } from '@react-navigation/native'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { Modal, StyleSheet, View } from 'react-native'
import { useTranslation } from 'react-i18next'

const SendConfirmationModal: React.FC<{
    visible: boolean
    amount: number
    unit: string
}> = ({ visible, amount, unit }) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const navigation = useNavigation()

    return (
        <Modal
            animationType="fade"
            visible={visible}
            onRequestClose={() => {
                navigation.navigate('Home')
            }}>
            <View style={styles(theme).modalContent}>
                <Text style={styles(theme).modalText}>
                    {t('feature.send.you-sent')}
                </Text>
                <Text style={styles(theme).modalText}>
                    {`${amount} ${unit}`}
                </Text>
                <View style={styles(theme).buttonContainer}>
                    <Button
                        title={t('words.done')}
                        onPress={() => {
                            navigation.navigate('Home')
                        }}
                    />
                </View>
            </View>
        </Modal>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        modalContent: {
            backgroundColor: theme.colors.secondary,
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
        },
        modalText: {
            color: theme.colors.primary,
            fontSize: 30,
            margin: 10,
        },
        buttonContainer: {
            width: '90%',
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            margin: 10,
        },
    })

export default SendConfirmationModal
