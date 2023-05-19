import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet } from 'react-native'

import {
    resetXmppClient,
    useChatContext,
} from '../../../state/contexts/ChatContext'
import { NavigationHook } from '../../../types/navigation'
import Header from '../../ui/Header'
import SvgImage from '../../ui/SvgImage'

const ChatHeader: React.FC<{}> = () => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const navigation = useNavigation<NavigationHook>()
    const { state, dispatch } = useChatContext()
    const { websocketIsHealthy, xmppClient } = state
    const [repairingWebsocket, setRepairingWebsocket] = useState<boolean>(false)

    useEffect(() => {
        if (
            xmppClient &&
            websocketIsHealthy === false &&
            repairingWebsocket === true
        ) {
            dispatch(resetXmppClient())
        }
    }, [dispatch, repairingWebsocket, websocketIsHealthy, xmppClient])

    useEffect(() => {
        if (xmppClient === null || websocketIsHealthy === true) {
            setRepairingWebsocket(false)
        }
    }, [xmppClient, websocketIsHealthy])

    return (
        <Header
            leftContainerStyle={{ flex: 6 }}
            headerLeft={
                <Text h2 medium>
                    {t('words.chat')}
                </Text>
            }
            headerRight={
                <>
                    <Pressable
                        disabled={websocketIsHealthy || repairingWebsocket}
                        onPress={() =>
                            repairingWebsocket === false &&
                            setRepairingWebsocket(true)
                        }
                        hitSlop={5}
                        style={styles(theme).iconContainer}>
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
                            hitSlop={5}
                            style={styles(theme).iconContainer}>
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
        iconContainer: {
            flexDirection: 'row',
            alignItems: 'flex-end',
        },
        rightContainer: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
        },
    })

export default ChatHeader
