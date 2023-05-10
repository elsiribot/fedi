import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React, { useEffect } from 'react'
import { ImageBackground, StyleSheet, View } from 'react-native'

import {
    selectActiveFederation,
    setActiveFederationId,
} from '@fedi/common/redux'

import { Images } from '../assets/images'
import {
    changeWebsocketIsHealthy,
    resetXmppClient,
    useChatContext,
} from '../state/contexts/ChatContext'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import { MainNavigatorDrawerParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    MainNavigatorDrawerParamList,
    'SwitchingFederations'
>

const SwitchingFederations: React.FC<Props> = ({
    navigation,
    route,
}: Props) => {
    const { theme } = useTheme()
    const { federationId } = route.params
    const { dispatch } = useChatContext()
    const reduxDispatch = useAppDispatch()

    const activeFederation = useAppSelector(selectActiveFederation)
    const previousActiveFederation = activeFederation

    useEffect(() => {
        if (
            federationId &&
            previousActiveFederation &&
            federationId !== previousActiveFederation?.id
        ) {
            dispatch(changeWebsocketIsHealthy(false))
            dispatch(resetXmppClient())
            reduxDispatch(setActiveFederationId(federationId))
            navigation.reset({
                index: 0,
                routes: [{ name: 'MainNavigator' }],
            })
        }
    }, [
        dispatch,
        federationId,
        previousActiveFederation,
        reduxDispatch,
        navigation,
    ])

    return (
        <View style={styles(theme).container}>
            <ImageBackground
                resizeMode="cover"
                style={styles(theme).imageBackground}
                source={Images.IllustrationWorld}
            />
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            padding: theme.spacing.lg,
            marginTop: theme.spacing.xl,
        },
        imageBackground: {
            ...theme.styles.h100w100,
        },
    })

export default SwitchingFederations
