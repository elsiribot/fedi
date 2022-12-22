import { CheckBox, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { RootStackParamList } from '../types/navigation'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { LightningGateway } from '../bridge'
import { useBridge } from '../contexts/FederationsContext'
import { ActivityIndicator } from 'react-native'

export type Props = NativeStackScreenProps<RootStackParamList, 'SendSuccess'>

const DeveloperSettings: React.FC<Props> = ({ route }: Props) => {
    // const { t } = useTranslation()
    const { theme } = useTheme()
    // const { amount, unit } = route.params
    const { listGateways, switchGateway } = useBridge()
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [gateways, setGateways] = useState<LightningGateway[]>([])

    useEffect(() => {
        const getTransactionsList = async () => {
            setIsLoading(true)
            const _gateways = await listGateways()
            setIsLoading(false)
            setGateways(_gateways)
        }

        getTransactionsList()
    }, [listGateways])

    const handleSelectGateway = async (gateway: LightningGateway) => {
        await switchGateway(gateway)
        const updatedGateways = gateways.map((gw: LightningGateway) => {
            gw.active = gateway.nodePubKey === gw.nodePubKey
            return gw
        })
        setGateways(updatedGateways)
    }

    if (isLoading) return <ActivityIndicator />
    return (
        <View style={styles(theme).container}>
            <Text>Change your lightning gateway</Text>
            {gateways.map((gw: LightningGateway) => (
                <View>
                    <CheckBox
                        title={
                            <Text style={styles(theme).checkboxText}>
                                {gw.api}
                            </Text>
                        }
                        checked={gw.active}
                        onPress={() => handleSelectGateway(gw)}
                    />
                </View>
            ))}
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
        checkboxText: {
            paddingHorizontal: theme.spacing.md,
            textAlign: 'left',
        },
    })

export default DeveloperSettings
