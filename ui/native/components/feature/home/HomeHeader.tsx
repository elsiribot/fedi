import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet } from 'react-native'

import { selectFederationMetadata } from '@fedi/common/redux'
import { shouldShowOfflineWallet } from '@fedi/common/utils/FederationUtils'

import { useAppSelector } from '../../../state/hooks'
import { NavigationHook } from '../../../types/navigation'
import Header from '../../ui/Header'
import SvgImage from '../../ui/SvgImage'
import SelectedFederationHeader from '../federations/SelectedFederationHeader'

const HomeHeader: React.FC = () => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const navigation = useNavigation<NavigationHook>()
    const activeFederationMetadata = useAppSelector(selectFederationMetadata)

    const showOfflineWallet =
        activeFederationMetadata &&
        shouldShowOfflineWallet(activeFederationMetadata)

    const style = styles(theme)

    return (
        <>
            <SelectedFederationHeader />
            <Header
                inline
                containerStyle={style.container}
                headerLeft={
                    <Text h2 medium>
                        {t('words.home')}
                    </Text>
                }
                headerRight={
                    showOfflineWallet && (
                        <Pressable
                            onPress={() => navigation.navigate('OmniScanner')}
                            hitSlop={5}
                            style={style.iconContainer}>
                            <SvgImage name="OmniScan" />
                        </Pressable>
                    )
                }
                rightContainerStyle={style.rightContainer}
                // Needed to make more room for Wallet title in headerLeft
                centerContainerStyle={{ flex: 1 }}
            />
        </>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            paddingBottom: theme.spacing.lg,
        },
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

export default HomeHeader
