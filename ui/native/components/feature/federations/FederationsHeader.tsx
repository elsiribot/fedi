import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { NavigationHook } from '../../../types/navigation'
import { isNightly } from '../../../utils/device-info'
import Flex from '../../ui/Flex'
import Header from '../../ui/Header'
import MainHeaderButtons from '../../ui/MainHeaderButtons'

const FederationsHeader: React.FC = () => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const navigation = useNavigation<NavigationHook>()
    const showNightlyBanner = useMemo(() => isNightly(), [])

    const style = styles(theme)

    const openJoinCommunity = () => {
        // TODO: make sure there is a back button on this next screen to match designs
        navigation.navigate('PublicFederations')
    }

    return (
        <Flex gap="md" style={style.contentContainer}>
            <Header
                transparent
                containerStyle={style.headerContainer}
                headerLeft={<Text h2>{t('words.wallets')}</Text>}
                headerRight={
                    <MainHeaderButtons onAddPress={openJoinCommunity} />
                }
            />
            {/* TODO: restore this on federations screen */}
            {/* <NetworkBanner /> */}
            {showNightlyBanner && (
                <View style={style.nightly}>
                    <Text small style={style.nightlyText} adjustsFontSizeToFit>
                        {t('feature.developer.nightly')}
                    </Text>
                </View>
            )}
        </Flex>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            borderBottomLeftRadius: 16,
            borderBottomRightRadius: 16,
        },
        contentContainer: {
            paddingHorizontal: theme.spacing.lg,
            backgroundColor: 'transparent',
        },
        headerContainer: {
            justifyContent: 'center',
            paddingHorizontal: 0,
        },
        nightly: {
            position: 'absolute',
            bottom: 0,
            right: theme.spacing.lg,
            backgroundColor: theme.colors.primary,
            paddingHorizontal: theme.spacing.sm,
            borderTopLeftRadius: 5,
            borderTopRightRadius: 5,
        },
        nightlyText: {
            fontSize: 10,
            color: theme.colors.secondary,
        },
    })

export default FederationsHeader
