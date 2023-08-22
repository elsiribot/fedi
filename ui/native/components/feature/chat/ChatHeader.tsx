import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet } from 'react-native'

import {
    connectChat,
    disconnectChat,
    selectChatXmppClient,
    selectWebsocketIsHealthy,
} from '@fedi/common/redux'

import { fedimint } from '../../../bridge'
import { useEnvironmentContext } from '../../../state/contexts/EnvironmentContext'
import { useAppDispatch, useAppSelector } from '../../../state/hooks'
import { NavigationHook } from '../../../types/navigation'
import Header from '../../ui/Header'
import SvgImage from '../../ui/SvgImage'

const ChatHeader: React.FC<{}> = () => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const navigation = useNavigation<NavigationHook>()
    const { toast } = useEnvironmentContext().state
    const websocketIsHealthy = useAppSelector(selectWebsocketIsHealthy)
    const xmppClient = useAppSelector(selectChatXmppClient)
    const activeFederationId = useAppSelector(
        s => s.federation.activeFederationId,
    )
    const dispatch = useAppDispatch()
    const [repairingWebsocket, setRepairingWebsocket] = useState<boolean>(false)

    useEffect(() => {
        const repairWebsocket = async () => {
            await dispatch(
                disconnectChat({
                    federationId: activeFederationId as string,
                }),
            ).unwrap()
            dispatch(
                connectChat({
                    fedimint,
                    federationId: activeFederationId as string,
                }),
            )
        }

        if (
            xmppClient &&
            websocketIsHealthy === false &&
            repairingWebsocket === true
        ) {
            repairWebsocket()
        }
    }, [
        activeFederationId,
        dispatch,
        repairingWebsocket,
        websocketIsHealthy,
        xmppClient,
    ])

    useEffect(() => {
        if (xmppClient === null || websocketIsHealthy === true) {
            setRepairingWebsocket(false)
        }
    }, [xmppClient, websocketIsHealthy])

    return (
        <Header
            inline
            leftContainerStyle={{ flex: 2 }}
            headerLeft={
                <Text h2 medium>
                    {t('words.chat')}
                </Text>
            }
            centerContainerStyle={{ flex: 2 }}
            headerRight={
                <>
                    <Pressable
                        disabled={websocketIsHealthy || repairingWebsocket}
                        onPress={() => {
                            if (repairingWebsocket === false) {
                                setRepairingWebsocket(true)
                                toast?.show(
                                    t('errors.chat-connection-restoring'),
                                    3000,
                                )
                            }
                        }}
                        hitSlop={5}>
                        <SvgImage
                            name="Recovery"
                            color={theme.colors.primaryLight}
                            containerStyle={{
                                opacity: websocketIsHealthy ? 0 : 0.2,
                            }}
                        />
                    </Pressable>
                    {websocketIsHealthy && (
                        <Pressable
                            onPress={() => navigation.navigate('MemberQrCode')}
                            hitSlop={5}>
                            <SvgImage name="Qr" color={theme.colors.primary} />
                        </Pressable>
                    )}
                </>
            }
            rightContainerStyle={styles(theme).rightContainer}
        />
    )
}

const styles = (_theme: Theme) =>
    StyleSheet.create({
        rightContainer: {
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'space-between',
        },
    })

export default ChatHeader
