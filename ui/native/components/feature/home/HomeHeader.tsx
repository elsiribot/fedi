import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'

import { selectFederationMetadata } from '@fedi/common/redux'
import { shouldShowOfflineWallet } from '@fedi/common/utils/FederationUtils'

import { useAppSelector } from '../../../state/hooks'
import { NavigationHook } from '../../../types/navigation'
import Header from '../../ui/Header'
import { PressableIcon } from '../../ui/PressableIcon'
import SelectedFederationHeader from '../federations/SelectedFederationHeader'
import { NetworkBanner } from '../wallet/NetworkBanner'

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
            <NetworkBanner />
            <Header
                inline
                containerStyle={style.container}
                headerLeft={
                    <Text h2 medium>
                        {t('words.community')}
                    </Text>
                }
                headerRight={
                    showOfflineWallet && (
                        <PressableIcon
                            onPress={() => {
                                navigation.navigate('Settings')
                            }}
                            hitSlop={5}
                            svgName="Cog"
                        />
                    )
                }
                rightContainerStyle={style.rightContainer}
                // Needed to make more room for Wallet title in headerLeft
                centerContainerStyle={{ flex: 0 }}
            />
        </>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            paddingBottom: theme.spacing.lg,
        },
        rightContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
        },
    })

export default HomeHeader
