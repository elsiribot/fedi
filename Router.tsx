import { NavigationContainer } from '@react-navigation/native'
import { createDrawerNavigator } from '@react-navigation/drawer'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Icon, Text, useTheme } from '@rneui/themed'
import React from 'react'
import { TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'

import Backup from './screens/Backup'
import ConfirmSendLightning from './screens/ConfirmSendLightning'
import ConfirmSendOnChain from './screens/ConfirmSendOnChain'
import Home from './screens/Home'
import LnInvoice from './screens/LnInvoice'
import LnReceiveSuccess from './screens/LnReceiveSuccess'
import OnChainReceiveSuccess from './screens/OnChainReceiveSuccess'
import Receive from './screens/Receive'
import RequestCameraAccess from './screens/RequestCameraAccess'
import ScanFederationCode from './screens/ScanFederationCode'
import Send from './screens/Send'
import Splash from './screens/Splash'
import Transactions from './screens/Transactions'

import Header from './components/ui/Header'
import SelectedFederationHeader from './components/feature/federations/SelectedFederationHeader'
import ConnectedFederationsDrawer from './components/feature/federations/ConnectedFederationsDrawer'
import { useFederationsContext } from './contexts/FederationsContext'

export type RootStackParamList = {
    Backup: undefined
    ConfirmSendLightning: { invoice: string }
    ConfirmSendOnChain: { address: string }
    ConnectedFederationsDrawer: undefined
    Home: undefined
    LnInvoice: { invoice: string }
    LnReceiveSuccess: { amountReceived: string }
    OnChainReceiveSuccess: { amountReceived: string }
    Receive: undefined
    RequestCameraAccess: undefined
    ScanFederationCode: undefined
    Send: undefined
    Splash: undefined
    Transactions: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()
const Drawer = createDrawerNavigator()

const MainNavigator = () => {
    const { t } = useTranslation()
    const {
        state: { selectedFederation },
    } = useFederationsContext()

    return (
        <Stack.Navigator id="MainStackNavigator" initialRouteName="Splash">
            <>
                {selectedFederation !== null ? (
                    // This group of screens relies on a non-null selectedFederation
                    // in the FederationsContext because they contain API calls to the
                    // FFI NativeModule. Since it is possible to store multiple federation
                    // connections in-app, each call requires a Federation to be specified
                    <Stack.Group>
                        <Stack.Group>
                            <Stack.Screen
                                name="Home"
                                component={Home}
                                options={({ navigation }) => ({
                                    header: () => (
                                        <SelectedFederationHeader
                                            navigation={navigation}
                                        />
                                    ),
                                })}
                            />
                            <Stack.Screen
                                name="Backup"
                                component={Backup}
                                options={{
                                    title: `${t('words.backup')}`,
                                }}
                            />
                            <Stack.Screen
                                name="ConfirmSendLightning"
                                component={ConfirmSendLightning}
                                options={{
                                    title: `${t('feature.send.confirm-send')}`,
                                }}
                            />
                            <Stack.Screen
                                name="ConfirmSendOnChain"
                                component={ConfirmSendOnChain}
                                options={{
                                    title: `${t('feature.send.confirm-send')}`,
                                }}
                            />
                            <Stack.Screen
                                name="LnInvoice"
                                component={LnInvoice}
                                options={{
                                    title: `${t('phrases.receive-bitcoin')}`,
                                }}
                            />
                            <Stack.Screen
                                name="LnReceiveSuccess"
                                component={LnReceiveSuccess}
                                options={{ headerShown: false }}
                            />
                            <Stack.Screen
                                name="OnChainReceiveSuccess"
                                component={OnChainReceiveSuccess}
                                options={{ headerShown: false }}
                            />
                            <Stack.Screen
                                name="Receive"
                                component={Receive}
                                options={({ navigation }) => ({
                                    header: () => (
                                        <Header
                                            headerCenter={
                                                <Text h4>
                                                    {t(
                                                        'phrases.receive-bitcoin',
                                                    )}
                                                </Text>
                                            }
                                            headerRight={
                                                <TouchableOpacity
                                                    onPress={() =>
                                                        navigation.goBack()
                                                    }>
                                                    <Icon name={'close'} />
                                                </TouchableOpacity>
                                            }
                                        />
                                    ),
                                })}
                            />
                            <Stack.Screen
                                name="RequestCameraAccess"
                                component={RequestCameraAccess}
                                options={{ headerShown: false }}
                            />
                            <Stack.Screen
                                name="Send"
                                component={Send}
                                options={{
                                    title: `${t('words.send')}`,
                                }}
                            />
                        </Stack.Group>
                        <Stack.Group screenOptions={{ presentation: 'modal' }}>
                            <Stack.Screen
                                name="Transactions"
                                component={Transactions}
                                options={({ navigation }) => ({
                                    header: () => (
                                        <Header
                                            headerCenter={
                                                <Text h4>
                                                    {t('words.transactions')}
                                                </Text>
                                            }
                                            headerRight={
                                                <TouchableOpacity
                                                    onPress={() =>
                                                        navigation.goBack()
                                                    }>
                                                    <Icon name={'close'} />
                                                </TouchableOpacity>
                                            }
                                        />
                                    ),
                                })}
                            />
                        </Stack.Group>
                    </Stack.Group>
                ) : (
                    // This group of screens does not assume any federation connections
                    // have been established and are used primarily for onboarding the
                    // user to connect to at least 1 federation
                    <Stack.Group>
                        <Stack.Screen
                            name="Splash"
                            component={Splash}
                            options={{
                                headerShown: false,
                            }}
                        />
                        <Stack.Screen
                            name="RequestCameraAccess"
                            component={RequestCameraAccess}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="ScanFederationCode"
                            component={ScanFederationCode}
                            options={({ navigation }) => ({
                                header: () => (
                                    <Header
                                        headerLeft={
                                            <TouchableOpacity
                                                onPress={() =>
                                                    navigation.goBack()
                                                }>
                                                <Icon
                                                    name={'angle-left'}
                                                    type="font-awesome"
                                                />
                                            </TouchableOpacity>
                                        }
                                        headerCenter={
                                            <Text h4>
                                                {t(
                                                    'feature.federations.scan-federation-invite',
                                                )}
                                            </Text>
                                        }
                                        centerContainerStyle={{
                                            flex: 3,
                                        }}
                                    />
                                ),
                            })}
                        />
                    </Stack.Group>
                )}
            </>
        </Stack.Navigator>
    )
}

const Router = () => {
    const { theme } = useTheme()

    return (
        <NavigationContainer theme={theme}>
            <Drawer.Navigator
                id="ConnectedFederationsDrawer"
                drawerContent={ConnectedFederationsDrawer}>
                <Drawer.Screen
                    name="MainNavigator"
                    component={MainNavigator}
                    options={{ headerShown: false }}
                />
            </Drawer.Navigator>
        </NavigationContainer>
    )
}

export default Router
